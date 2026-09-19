const TOKEN = "vcp_8bRsDfnuW9s0f2I0eKzDHa2762RRPDDXtCbXk5qThkRfyog0zh0GZVQr";
const PROJECT_ID = "prj_sCvulhFpYfuCiRiweWkEJnn6h45T"; 
const TEAM_ID = "team_4PfeW3LNRUhWz6orh4NmhhdD";

(async () => {
  const url = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1&teamId=${TEAM_ID}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  const latest = data.deployments?.[0];
  
  if(!latest) {
    console.log("No deployments found.");
    return;
  }
  
  console.log(`Fetching logs for deployment ${latest.url}...`);
  // fetch logs
  // Vercel deployment events API: GET /v2/deployments/{id}/events
  const logsUrl = `https://api.vercel.com/v2/deployments/${latest.uid}/events?teamId=${TEAM_ID}&direction=backward&limit=50`;
  const logsRes = await fetch(logsUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const logsData = await logsRes.json();
  
  if (Array.isArray(logsData)) {
    logsData.reverse().forEach(log => {
      console.log(`[${new Date(log.created).toISOString()}] ${log.type}: ${log.payload?.text || JSON.stringify(log.payload)}`);
    });
  } else {
    console.log(logsData);
  }
})();
