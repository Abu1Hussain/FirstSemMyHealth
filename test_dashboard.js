const puppeteer = require('puppeteer');

(async () => {
    // Launch browser
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Capture page errors and console logs
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`PAGE ERROR: ${msg.text()}`);
        } else {
            console.log(`PAGE LOG: ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        console.log(`UNCAUGHT EXCEPTION: ${error.message}`);
    });

    try {
        console.log("Navigating to login...");
        await page.goto('http://localhost/FirstSemMyHealth/loginReg/login.html');
        
        // Wait for inputs
        await page.waitForSelector('input[name="email"]');
        await page.type('input[name="email"]', 'patient@AM.com');
        await page.type('input[name="password"]', 'pass1234');
        
        // Click Login
        await page.click('button[type="submit"]');
        
        // Wait for navigation or MFA
        await page.waitForNavigation({waitUntil: 'networkidle2'});
        const url = page.url();
        console.log("Navigated to: " + url);
        
        if (url.includes('MFA.html')) {
            console.log("On MFA page, processing...");
            // Just click Verify (it seems MFA input might not be strict or just taking 111111)
            await page.waitForSelector('#first');
            await page.type('#first', '1');
            await page.type('#second', '1');
            await page.type('#third', '1');
            await page.type('#fourth', '1');
            await page.type('#fifth', '1');
            await page.type('#sixth', '1');
            
            await page.click('button#verifyMfaButton'); // Note: Make sure ID is correct or find button
            
            // wait for redirect
            await page.waitForNavigation({waitUntil: 'networkidle2'});
            console.log("After MFA Navigated to: " + page.url());
        }

        // Now we should be on patient dashboard
        console.log("Waiting for dashboard data...");
        // Wait for network requests to settle
        await new Promise(r => setTimeout(r, 3000));
        
        const doctorsText = await page.evaluate(() => {
            const el = document.getElementById("doctors-list");
            return el ? el.innerText : 'null';
        });
        console.log("Doctors list contains: " + doctorsText);

    } catch (e) {
        console.log("Error during test: " + e.message);
    } finally {
        await browser.close();
    }
})();
