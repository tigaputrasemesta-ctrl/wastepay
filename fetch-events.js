const TOKEN = "vcp_8bRsDfnuW9s0f2I0eKzDHa2762RRPDDXtCbXk5qThkRfyog0zh0GZVQr";
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; 
(async () => {
  const url = `https://api.vercel.com/v3/events?projectId=${PROJECT_ID}&limit=10`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  for (const e of data.events || []) {
      if (e.type === "error" || e.payload?.level === "error") {
          console.log(e);
      }
  }
})();
