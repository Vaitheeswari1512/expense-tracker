const puppeteer = require('puppeteer');
const http = require('http');

function apiCall(path, method, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost', port: 5000,
      path, method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(options, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('\n===== BACKEND TEST =====');

  // Test health
  const health = await new Promise(res => {
    http.get('http://localhost:5000/health', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', e => res({ error: e.message }));
  });
  console.log('✅ Health:', JSON.stringify(health));

  // Test register with unique email
  const ts = Date.now();
  const regResult = await apiCall('/api/auth/register', 'POST', {
    name: 'Test User', email: `testuser_${ts}@test.com`, password: 'Test@1234', phone: '9999999999'
  });
  console.log('✅ Register Status:', regResult.status);
  console.log('   Register Body:', JSON.stringify(regResult.body).substring(0, 200));

  // Test login with those credentials
  const loginResult = await apiCall('/api/auth/login', 'POST', {
    email: `testuser_${ts}@test.com`, password: 'Test@1234'
  });
  console.log('✅ Login Status:', loginResult.status);
  if (loginResult.body.token) {
    console.log('   Token received:', loginResult.body.token.substring(0, 30) + '...');
    console.log('   User:', JSON.stringify(loginResult.body.user));
  } else {
    console.log('   Error:', loginResult.body.error);
  }

  console.log('\n===== UI SCREENSHOTS =====');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Go to the app
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));

  // Check if we're on login or dashboard
  const bodyText = await page.evaluate(() => document.body.innerText);

  if (bodyText.includes('Logout') || bodyText.includes('Dashboard') || bodyText.includes('Recent Transactions')) {
    console.log('→ Already logged in, taking Home screenshot...');
    await page.screenshot({ path: 'screenshot_home.png', fullPage: false });
    console.log('✅ Home screenshot saved');

    // Log out
    const loggedOut = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('div, button, span'));
      const el = all.find(e => e.textContent.trim() === 'Logout' || e.textContent.includes('Log out'));
      if (el) { el.click(); return true; }
      return false;
    });
    if (loggedOut) {
      await new Promise(r => setTimeout(r, 2000));
      console.log('→ Logged out, now on Login page');
    }
  }

  await page.screenshot({ path: 'screenshot_login.png', fullPage: false });
  console.log('✅ Login page screenshot saved');

  // Navigate to Register
  const navigatedToRegister = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div, button, span, a'));
    const el = all.find(e => e.textContent.includes('Sign Up') && !e.textContent.includes('SIGN UP'));
    if (el) { el.click(); return true; }
    // Try SIGN UP too
    const el2 = all.find(e => e.textContent.trim() === 'Sign Up');
    if (el2) { el2.click(); return true; }
    return false;
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshot_register.png', fullPage: false });
  console.log('✅ Register page screenshot saved');

  await browser.close();
  console.log('\nDone! Check screenshot_home.png, screenshot_login.png, screenshot_register.png');
})();
