import crypto from 'crypto';

const merchantCode = process.env.DUITKU_MERCHANT_CODE;
const key = process.env.DUITKU_API_KEY;
const orderId = "DW-F7451A6254556D17";

function hmacSha256(input: string, key: string): string {
  return crypto.createHmac("sha256", key).update(input).digest("hex");
}
function signatureStatus(merchantCode: string, orderId: string, key: string): string {
  return hmacSha256(`${merchantCode}${orderId}`, key);
}
const signature = signatureStatus(merchantCode!, orderId, key!);

const body = {
  merchantCode,
  merchantOrderId: orderId,
  signature
};

async function main() {
  const url = `https://sandbox.duitku.com/webapi/api/merchant/transactionStatus`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log(data);
}

main().catch(console.error);
