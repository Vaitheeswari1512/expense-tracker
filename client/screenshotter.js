const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  
  // wait for layout
  await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

  // Try to find the logout button if we are logged in
  const html = await page.content();
  if (html.includes('Logout')) {
    await page.screenshot({ path: 'home.png' });
    
  const logoutButtonFound = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('Logout'));
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  if (logoutButtonFound) {
    await new Promise(r => setTimeout(r, 2000));
  }
  }

  await page.screenshot({ path: 'login.png' });
  
  // Find "Sign Up" and click it
  const signUpFound = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('Sign Up') || el.textContent.includes('SIGN UP'));
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  if (signUpFound) {
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log('Sign Up not found');
  }

  await page.screenshot({ path: 'register.png' });
  
  await browser.close();
})();
