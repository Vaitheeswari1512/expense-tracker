const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Create an array to collect logs
  const logs = [];
  
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('Page Error:', err.toString());
  });

  page.on('requestfailed', request => {
    console.error(`Request failed: ${request.url()} - ${request.failure().errorText}`);
  });

  console.log('Navigating to http://localhost:8081...');
  
  try {
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Evaluate the page content
    const content = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasRoot: !!root,
        rootHtml: root ? root.innerHTML : null,
      };
    });
    
    console.log('Page Content Analysis:', content);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug_screenshot.png' });
    console.log('Screenshot saved to debug_screenshot.png');
    
  } catch (err) {
    console.error('Error during navigation or evaluation:', err);
  } finally {
    await browser.close();
  }
})();
