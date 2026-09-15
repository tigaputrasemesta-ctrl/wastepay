#!/usr/bin/env node
/**
 * Standalone MCP caller — verify and drive stdio MCP servers from the shell.
 *
 * Reads server definitions from `.mcp.json` in the project root (same file the
 * pi bridge, Claude Code, Cursor, and Gemini CLI use), so every client stays
 * in sync.
 *
 * Usage:
 *   node scripts/mcp-call.mjs <server> --list
 *       List the server's tools, including their input schemas.
 *   node scripts/mcp-call.mjs <server> <tool> '<json-args>'
 *       Call <tool> with the given JSON arguments and print the result.
 *   node scripts/mcp-call.mjs <server> <tool> '<json-args>' --tokens 200
 *       (context7 query-docs only) cap returned documentation.
 *
 * Examples:
 *   node scripts/mcp-call.mjs context7 --list
 *   node scripts/mcp-call.mjs context7 resolve-library-id '{"query":"next.js"}'
 *   node scripts/mcp-call.mjs context7 query-docs '{"context7CompatibleLibraryID":"/vercel/next.js","topic":"loading.ts","tokens":3000}'
 *   node scripts/mcp-call.mjs sequential-thinking sequentialthinking '{"thought":"step 1","nextThoughtRequired":true,"thoughtNumber":1,"totalThoughts":3}'
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const PROTOCOL_VERSION = "2024-11-05";
const CONNECT_TIMEOUT_MS = 90_000;
const CALL_TIMEOUT_MS = 120_000;

function loadServers() {
  const configPath = join(projectRoot, ".mcp.json");
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8"));
    return parsed.mcpServers ?? {};
  } catch (error) {
    console.error(`Cannot read ${configPath}: ${error.message}`);
    process.exit(1);
  }
}

function connect(name, config) {
  return new Promise((resolveFn, rejectFn) => {
    const proc = spawn(config.command, config.args ?? [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(config.env ?? {}) },
      cwd: projectRoot,
      shell: process.platform === "win32",
    });
    let buffer = "";
    const pending = new Map();
    let id = 1;

    const send = (message) => proc.stdin.write(JSON.stringify(message) + "\n");
    const request = (method, params, timeoutMs) =>
      new Promise((res, rej) => {
        const requestId = id++;
        const timer = setTimeout(() => {
          pending.delete(requestId);
          rej(new Error(`"${method}" timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        pending.set(requestId, { res, rej, timer });
        send({ jsonrpc: "2.0", id: requestId, method, params });
      });

    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.jsonrpc !== "2.0" || typeof message.id !== "number") continue;
        const entry = pending.get(message.id);
        if (!entry) continue;
        pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error) entry.rej(new Error(`MCP error ${message.error.code}: ${message.error.message}`));
        else entry.res(message.result);
      }
    });
    proc.stderr.on("data", (d) => process.stderr.write(`[stderr] ${d}`));
    proc.on("error", (e) => rejectFn(new Error(`Failed to spawn ${name}: ${e.message}`)));

    const client = {
      listTools: () => request("tools/list", {}, CALL_TIMEOUT_MS).then((r) => r.tools ?? []),
      callTool: (toolName, args) => request("tools/call", { name: toolName, arguments: args }, CALL_TIMEOUT_MS),
      close: () => {
        try { proc.stdin.destroy(); } catch { /* closed */ }
        try { proc.kill("SIGKILL"); } catch { /* dead */ }
      },
    };

    request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "mcp-call-cli", version: "1.0.0" },
    }, CONNECT_TIMEOUT_MS)
      .then(() => {
        send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
        resolveFn(client);
      })
      .catch((error) => {
        client.close();
        rejectFn(error);
      });
  });
}

async function main() {
  const [, , serverName, ...rest] = process.argv;
  const servers = loadServers();
  const config = servers[serverName];
  if (!config) {
    console.error(`Unknown server: ${serverName ?? "(none)"}\nConfigured: ${Object.keys(servers).join(", ")}`);
    process.exit(1);
  }

  const client = await connect(serverName, config);
  try {
    if (rest[0] === "--list") {
      const tools = await client.listTools();
      console.log(`${serverName}: ${tools.length} tool(s)`);
      for (const tool of tools) {
        console.log(`\n  ${tool.name}`);
        if (tool.description) console.log(`    ${tool.description.split("\n")[0].slice(0, 160)}`);
        if (tool.inputSchema) console.log(`    schema: ${JSON.stringify(tool.inputSchema)}`);
      }
      return;
    }

    const toolName = rest[0];
    const args = rest[1] ? JSON.parse(rest[1]) : {};
    const result = await client.callTool(toolName, args);
    const text = (result.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    if (result.isError) {
      console.error(`Tool error:\n${text}`);
      process.exitCode = 1;
    } else {
      console.log(text || "(no text content)");
    }
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
