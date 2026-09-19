const TOKEN = "vcp_8bRsDfnuW9s0f2I0eKzDHa2762RRPDDXtCbXk5qThkRfyog0zh0GZVQr";
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; 

async function api(path, opts = {}) {
  const url = `https://api.vercel.com${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }
  });
  return res.json();
}

(async () => {
  const envRes = await api(`/v9/projects/${PROJECT_ID}/env`);
  const envs = envRes.envs || [];
  
  for (const e of envs) {
    if (e.key.startsWith("DUITKU")) {
      // Remove it first to recreate cleanly
      await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${e.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      console.log(`Deleted ${e.key}`);
    }
  }

  // Add them back as plain
  const toAdd = [
    { key: "DUITKU_IS_PRODUCTION", value: "true" },
    { key: "DUITKU_MERCHANT_CODE", value: "D24733" },
    { key: "DUITKU_API_KEY", value: "d16f3ff1b21840696c28e5a2684df91f" }
  ];

  for (const item of toAdd) {
    const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ 
          key: item.key, 
          value: item.value, 
          target: ["production", "preview", "development"], 
          type: "plain" 
      })
    });
    console.log(`Added ${item.key}:`, res.status);
  }
})();
