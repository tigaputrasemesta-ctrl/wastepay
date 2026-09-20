import { syncDuitkuPayment } from '../src/lib/duitku-sync.ts';

async function main() {
  console.log("Syncing dtId 29...");
  const res = await syncDuitkuPayment(29, {
    statusCode: "02",
    statusMessage: "EXPIRED",
    reference: "DS3440026IQHS3J7IFRMHN0U",
    amount: 55500,
    rawResponse: "{}"
  }, "status");

  console.log(res);
}

main().catch(console.error);
