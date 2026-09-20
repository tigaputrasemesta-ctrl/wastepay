async function main() {
  const url = 'https://o2whero.com/api/publik/duitku/status?orderId=DW-630DEF07338CF1F0';
  const res = await fetch(url);
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Data:", data);
}
main().catch(console.error);
