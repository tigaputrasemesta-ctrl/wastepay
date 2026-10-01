const TOKEN = require("fs").readFileSync(require("os").homedir() + "/.vercel_token", "utf-8").trim();
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
