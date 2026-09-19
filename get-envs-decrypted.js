const TOKEN = "vcp_8bRsDfnuW9s0f2I0eKzDHa2762RRPDDXtCbXk5qThkRfyog0zh0GZVQr";
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; 

(async () => {
  const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?decrypt=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  const envs = data.envs || [];
  envs.forEach(e => {
    if (e.key.startsWith("DUITKU")) {
      console.log(`${e.key} = ${e.value}`);
    }
  });
})();
