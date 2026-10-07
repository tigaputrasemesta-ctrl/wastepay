import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  console.log("Navigating to login...");
  await page.goto('https://upsheru.com/login');
  await page.screenshot({ path: 'login1.png' });
  
  console.log("Filling out login form...");
  await page.fill('input[type="email"]', 'rekoprihartono@hero.com');
  await page.fill('input[type="password"]', '111111');
  await page.click('button[type="submit"]');
  
  console.log("Waiting for navigation...");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'login2.png' });
  
  console.log("Navigating to tagihan...");
  await page.goto('https://upsheru.com/tagihan');
  
  console.log("Waiting for table to load...");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tagihan1.png' });
  
  const content = await page.content();
  if (content.includes('Kode') && content.includes('Pelanggan')) {
    console.log("Table headers found.");
  }
  
  // click "Kode"
  console.log("Clicking 'Kode' header to sort...");
  await page.evaluate(() => {
    const ths = Array.from(document.querySelectorAll('th'));
    const kodeTh = ths.find(th => th.textContent.includes('Kode'));
    if (kodeTh) kodeTh.click();
  });
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tagihan2.png' });
  
  // check if there's an arrow
  const htmlAfterClick = await page.content();
  if (htmlAfterClick.includes('▲') || htmlAfterClick.includes('▼')) {
    console.log("SUCCESS: Sorting arrows (▲/▼) found! The feature is working on production.");
  } else {
    console.log("FAILED: Sorting arrows not found after click.");
  }
  
  await browser.close();
})();
