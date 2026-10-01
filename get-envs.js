const TOKEN = require("fs").readFileSync(require("os").homedir() + "/.vercel_token", "utf-8").trim();
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; 

(async () => {
  const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}/env`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  const envs = data.envs || [];
  envs.forEach(e => {
    // Only log the keys to not leak secrets, except for DUITKU which we want to verify.
    if (e.key.startsWith("DUITKU")) {
      // Vercel returns `value` for some envs, but not encrypted ones unless decrypted.
      // But we can check if they exist and their targets.
      console.log(`Key: ${e.key}, Target: ${e.target.join(',')}`);
    }
  });
})();
