const crypto = require('crypto');
const mc = "D24733";
const key = "d16f3ff1b21840696c28e5a2684df91f";
const amount = 55500;
const orderId = "TEST-" + Math.floor(Math.random() * 100000);

const sigProd = crypto.createHash('sha256').update(mc + orderId + amount + key).digest('hex');

async function test(isProd) {
    const baseUrl = isProd ? "https://passport.duitku.com" : "https://sandbox.duitku.com";
    console.log(`Testing Inquiry ${baseUrl} ...`);
    const body = {
        merchantCode: mc,
        paymentAmount: amount,
        merchantOrderId: orderId,
        productDetails: "Test",
        email: "test@example.com",
        customerVaName: "Test User",
        phoneNumber: "081234567890",
        returnUrl: "https://o2whero.com/bayar",
        callbackUrl: "https://o2whero.com/api/publik/duitku/notification",
        signature: sigProd,
        expiryPeriod: 1440
    };
    try {
        const res = await fetch(`${baseUrl}/webapi/api/merchant/v2/inquiry`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        const text = await res.text();
        console.log(`Result: ${res.status} - ${text}`);
    } catch(e) { console.error(e.message); }
}

(async () => {
    await test(true);
    await test(false);
})();
