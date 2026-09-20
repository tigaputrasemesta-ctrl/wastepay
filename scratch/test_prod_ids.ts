async function main() {
  const ids = ["DW-F7451A6254556D17", "DW-630DEF07338CF1F0", "DW-3006A732A7326BA7"];
  for (const id of ids) {
    const url = `https://o2whero.com/api/publik/duitku/status?orderId=${id}`;
    console.log(`Fetching ${url}...`);
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log(`Status: ${res.status}`, data);
    } catch (err) {
      console.error(err);
    }
  }
}
main().catch(console.error);
