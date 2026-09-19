const crypto = require('crypto');
const mc = "D24733";
const key = "d16f3ff1b21840696c28e5a2684df91f";
const amount = 10000;
const dateStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/[-:]/g, '').replace(/ /g, '');
function formatDuitkuDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}
const formattedDate = formatDuitkuDatetime(new Date());

const sigProd = crypto.createHmac('sha256', key).update(mc + amount + formattedDate).digest('hex');

async function test(isProd) {
    const baseUrl = isProd ? "https://passport.duitku.com" : "https://sandbox.duitku.com";
    console.log(`Testing HMAC ${baseUrl} ...`);
    try {
        const res = await fetch(`${baseUrl}/webapi/api/merchant/paymentmethod/getpaymentmethod`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                merchantcode: mc,
                amount: amount,
                datetime: formattedDate,
                signature: sigProd
            })
        });
        const text = await res.text();
        console.log(`Result: ${res.status} - ${text}`);
    } catch(e) { console.error(e.message); }
}
test(true);
