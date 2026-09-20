async function main() {
  const url = 'http://localhost:3000/api/publik/duitku/status?orderId=DW-F7451A6254556D17';
  const res = await fetch(url);
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Data:", data);
}
main().catch(console.error);
