const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.log(`[BROWSER ERROR]: ${err.message}`);
  });

  try {
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 15000 });
    // wait a bit longer for JS to execute
    await page.waitForTimeout(5000);
    const content = await page.content();
    console.log('HTML length:', content.length);
  } catch (e) {
    console.error('Script Error:', e.message);
  } finally {
    await browser.close();
  }
})();
