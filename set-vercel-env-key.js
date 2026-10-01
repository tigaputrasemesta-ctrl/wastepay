const TOKEN = require("fs").readFileSync(require("os").homedir() + "/.vercel_token", "utf-8").trim();
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; 

(async () => {
  const url = `https://api.vercel.com/v10/projects/${PROJECT_ID}/env`;
  
  // List existing
  const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  const existing = new Map((data.envs || []).map((e) => [e.key, e]));
  
  const key = "DUITKU_API_KEY";
  const value = "d16f3ff1b21840696c28e5a2684df91f";
  
  const old = existing.get(key);
  if (old) {
    await fetch(`${url}/${old.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value, target: ["production"], type: "encrypted" }),
    });
    console.log("Updated API Key");
  }
})();
