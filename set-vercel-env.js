const TOKEN = "vcp_8bRsDfnuW9s0f2I0eKzDHa2762RRPDDXtCbXk5qThkRfyog0zh0GZVQr";
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; // Extracted from vercel-fix-env.mjs
const TEAM_ID = "team_4PfeW3LNRUhWz6orh4NmhhdD";
const API = "https://api.vercel.com";

async function api(path, opts = {}) {
  const url = `${API}${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

(async () => {
  // Check token
  const me = await api(`/v9/projects/${PROJECT_ID}`);
  if (me.status !== 200) {
    console.error("TOKEN INVALID:", JSON.stringify(me.data).slice(0, 200));
    process.exit(1);
  }
  console.log("Token OK. Project:", me.data.name);

  // List envs
  const envRes = await api(`/v9/projects/${PROJECT_ID}/env`);
  const existing = new Map((envRes.data?.envs || []).map((e) => [e.key, e]));

  // Add/Update DUITKU_IS_PRODUCTION
  const key = "DUITKU_IS_PRODUCTION";
  const value = "true";
  const old = existing.get(key);
  if (old) {
    console.log("Updating existing env...");
    const up = await api(`/v10/projects/${PROJECT_ID}/env/${old.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value, target: ["production"], type: "encrypted" }),
    });
    console.log(`PATCH ${key}:`, up.status);
  } else {
    console.log("Creating new env...");
    const cr = await api(`/v10/projects/${PROJECT_ID}/env`, {
      method: "POST",
      body: JSON.stringify({ key, value, target: ["production"], type: "encrypted" }),
    });
    console.log(`CREATE ${key}:`, cr.status);
  }

  console.log("Redeploying production...");
  // Redeploy
  const depl = await api(`/v6/deployments?projectId=${PROJECT_ID}&limit=1&target=production`);
  const latest = depl.data?.deployments?.[0];
  if (latest?.uid) {
    const rd = await api(`/v10/deployments/${latest.uid}/redeploy`, {
      method: "POST",
      body: JSON.stringify({ target: "production" }),
    });
    console.log("Redeploy status:", rd.status);
  } else {
    console.log("No existing deployment found to redeploy.");
  }
})();
