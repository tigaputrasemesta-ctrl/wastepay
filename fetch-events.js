const TOKEN = require("fs").readFileSync(require("os").homedir() + "/.vercel_token", "utf-8").trim();
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
