const TOKEN = require("fs").readFileSync(require("os").homedir() + "/.vercel_token", "utf-8").trim();
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; 
const TEAM_ID = "team_4PfeW3LNRUhWz6orh4NmhhdD";

(async () => {
  const url = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=3&teamId=${TEAM_ID}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  data.deployments.forEach(d => console.log(d.state, d.created, d.meta?.githubCommitMessage, d.target));
})();
