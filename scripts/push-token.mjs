const TOKEN = "vcp_8bRsDfnuW9s0f2I0eKzDHa2762RRPDDXtCbXk5qThkRfyog0zh0GZVQr";
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T";
const TEAM_ID = "team_4PfeW3LNRUhWz6orh4NmhhdD";
const API = "https://api.vercel.com";

const KEY = "TV_VIEW_TOKEN";
const VALUE = "oeZcx4nhgyjcJVJUVnMDrxY5Bw2vrdJL2-aYGm0_o1k";

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
  
  // List envs
  const envRes = await api(`/v9/projects/${PROJECT_ID}/env`);
  const existing = new Map((envRes.data?.envs || []).map((e) => [e.key, e]));

  const target = ["production", "preview", "development"];
  const old = existing.get(KEY);
  if (old) {
    console.log(`Updating existing env ${KEY}...`);
    const up = await api(`/v10/projects/${PROJECT_ID}/env/${old.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value: VALUE, target, type: "encrypted" }),
    });
    console.log(`PATCH ${KEY}:`, up.status);
  } else {
    console.log(`Creating new env ${KEY}...`);
    const cr = await api(`/v10/projects/${PROJECT_ID}/env`, {
      method: "POST",
      body: JSON.stringify({ key: KEY, value: VALUE, target, type: "encrypted" }),
    });
    console.log(`CREATE ${KEY}:`, cr.status);
  }
})();
