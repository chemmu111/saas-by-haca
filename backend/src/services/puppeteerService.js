import puppeteer from 'puppeteer';

let browserInstance = null;

// Launch options
const launchOptions = {
    headless: 'new',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process' // Optimization for containerized environments
    ]
};

/**
 * Get or create the Puppeteer browser instance (Singleton)
 */
export async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    console.log('🚀 Launching new shared Puppeteer instance...');
    try {
        browserInstance = await puppeteer.launch(launchOptions);

        // Handle disconnection to reset the instance variable
        browserInstance.on('disconnected', () => {
            console.log('⚠️ Puppeteer disconnected. Resetting instance.');
            browserInstance = null;
        });

        console.log('✅ Puppeteer launched successfully.');
        return browserInstance;
    } catch (error) {
        console.error('❌ Failed to launch Puppeteer:', error);
        throw error;
    }
}

/**
 * Gracefully close the browser instance
 */
export async function closeBrowser() {
    if (browserInstance) {
        console.log('🛑 Closing shared Puppeteer instance...');
        await browserInstance.close();
        browserInstance = null;
    }
}
