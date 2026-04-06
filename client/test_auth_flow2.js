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

        let bodyText = await page.evaluate(() => {
            const getStr = (el) => {
                if(el.children.length === 0) return ' ' + el.innerText + ' ';
                let s = '';
                for(let c of el.children) s += getStr(c);
                return s;
            }
            return document.body.innerText.replace(/\n/g, ' ');
        });
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

        console.log('Looking for register flow...');
        await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('*'));
            const btn = els.find(e => e.textContent === 'Sign Up' || e.textContent.includes('New here?'));
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        bodyText = await page.evaluate(() => document.body.innerText.replace(/\n/g, ' '));
        console.log('Register Page Body: ', bodyText.substring(0, 100));

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
            
            await new Promise(r => setTimeout(r, 5000)); // wait longer
            bodyText = await page.evaluate(() => document.body.innerText.replace(/\n/g, ' '));
            
            if (bodyText.includes('Dashboard') || bodyText.includes('Recent Transactions') || bodyText.includes('Balance')) {
                console.log('✅ Registration SUCCESS -> Transitioned to Home Screen!');
            } else if (bodyText.includes('Login') || bodyText.includes('Welcome Back')) {
                console.log('❌ Registration triggered something, but stuck on Login. Context:', bodyText.substring(0, 50));
            } else {
                console.log('⚠️ Final Body: ', bodyText);
            }
        } else {
            console.log('Inputs found:', inputs.length);
        }

        await page.screenshot({ path: 'frontend_flow2.png' });
        console.log('Saved frontend_flow2.png');
    } catch(err) {
        console.error('Error during test:', err);
    } finally {
        await browser.close();
    }
})();
