const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing Frontend Login Flow...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800 });

    try {
        console.log('Navigating to http://localhost:8081');
        await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));

        let bodyText = await page.evaluate(() => document.body.innerText.replace(/\n/g, ' '));
        console.log('Initial Body Text Snippet: ', bodyText.substring(0, 100));

        // If already on Dashboard, log out
        if (bodyText.includes('Dashboard') || bodyText.includes('Logout')) {
            console.log('Currently logged in. Logging out...');
            await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('*'));
                const btn = els.find(e => e.textContent === 'Logout');
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log('Filling login form...');
        const inputs = await page.$$('input');
        
        if (inputs.length >= 2) {
            // we need a registered user first!
            const http = require('http');
            const userTs = Date.now();
            const email = `user${userTs}@test.com`;
            const pass = 'Test1234';
            
            console.log('Registering user via API...', email);
            await new Promise((resolve) => {
              const data = JSON.stringify({ name:'Bob', email, password:pass, phone:'9999999999' });
              const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' }}, resolve);
              req.write(data); req.end();
            });

            await inputs[0].type(email);
            await inputs[1].type(pass);
            
            console.log('Submitting login...');
            await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('div, span, text'));
                const submitBtn = els.find(e => e.textContent === 'LOGIN');
                if (submitBtn) submitBtn.click();
            });
            
            await new Promise(r => setTimeout(r, 5000)); // wait longer
            bodyText = await page.evaluate(() => document.body.innerText.replace(/\n/g, ' '));
            
            if (bodyText.includes('Dashboard') || bodyText.includes('Recent Transactions') || bodyText.includes('Balance')) {
                console.log('✅ LOGIN SUCCESS -> Transitioned to Home Screen!');
            } else {
                console.log('⚠️ Final Body: ', bodyText);
            }
        } else {
            console.log('Inputs found:', inputs.length);
        }

        await page.screenshot({ path: 'frontend_flow3.png' });
        console.log('Saved frontend_flow3.png');
    } catch(err) {
        console.error('Error during test:', err);
    } finally {
        await browser.close();
    }
})();
