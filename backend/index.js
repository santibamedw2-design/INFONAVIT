const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Infonavit Automation Backend is running (Docker-Playwright Edition)!');
});

// Endpoint para obtener información de seguidores y nombre
app.get('/api/social-info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        console.log(`Intentando acceder a: ${url}`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        let data = { nombre: 'Detectado', seguidores: 0, plataforma: 'social' };
        if (url.includes('instagram.com')) data.plataforma = 'instagram';
        else if (url.includes('tiktok.com')) data.plataforma = 'tiktok';
        else if (url.includes('facebook.com')) data.plataforma = 'facebook';

        res.json(data);
    } catch (e) {
        console.error(`Error en social-info: ${e.message}`);
        res.status(500).json({ error: e.message });
    } finally {
        if (browser) await browser.close();
    }
});

// Endpoint para tomar capturas de pantalla
app.get('/api/screenshot', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        console.log(`Tomando captura de: ${url}`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 },
            isMobile: true
        });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(3000);

        const buffer = await page.screenshot({ type: 'png' });

        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) {
        console.error(`Error en screenshot: ${e.message}`);
        res.status(500).json({ error: e.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
