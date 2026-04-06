const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing Frontend Flow...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800 });

    try {
        console.log('Navigating to http://localhost:8081');
        await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));

        let bodyText = await page.evaluate(() => document.body.innerText);
        
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

        console.log('Looking for register flow...');
        await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('*'));
            const btn = els.find(e => e.textContent === 'Sign Up');
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        console.log('Filling registration form...');
        const ts = Date.now();
        const inputs = await page.$$('input');
        
        if (inputs.length >= 5) {
            await inputs[0].type('Test User ' + ts);
            await inputs[1].type('9999999999');
            await inputs[2].type(`user${ts}@test.com`);
            await inputs[3].type('Test1234');
            await inputs[4].type('Test1234');
            
            console.log('Submitting registration...');
            await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('div, span, text'));
                const submitBtn = els.find(e => e.textContent === 'SIGN UP');
                if (submitBtn) submitBtn.click();
            });
            
            await new Promise(r => setTimeout(r, 3000));
            bodyText = await page.evaluate(() => document.body.innerText);
            
            if (bodyText.includes('Dashboard') || bodyText.includes('Recent Transactions') || bodyText.includes('Balance')) {
                console.log('✅ Registration SUCCESS -> Transitioned to Home Screen!');
            } else if (bodyText.includes('Login') || bodyText.includes('Welcome Back')) {
                console.log('❌ Registration triggered something, but stuck on Login. Context:', bodyText.substring(0, 50));
            } else {
                console.log('⚠️ Unknown state after registration. Home screen strings not found.', bodyText.substring(0, 100));
            }
        } else {
            console.log('Inputs found:', inputs.length);
        }

        await page.screenshot({ path: 'frontend_flow.png' });
        console.log('Saved frontend_flow.png');
    } catch(err) {
        console.error('Error during test:', err);
    } finally {
        await browser.close();
    }
})();
