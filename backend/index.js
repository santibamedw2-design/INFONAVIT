const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ruta base para verificar que el servidor está vivo
app.get('/', (req, res) => {
    res.send('Infonavit Automation Backend is running (Docker Edition)!');
});

// Endpoint para obtener información de seguidores y nombre
app.get('/api/social-info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Abrir la URL con timeout largo para redes sociales
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });

        let data = { nombre: 'Encontrado', seguidores: 0, plataforma: 'detectada' };

        // Detección simple para confirmar que el browser funciona
        if (url.includes('instagram.com')) data.plataforma = 'instagram';
        else if (url.includes('tiktok.com')) data.plataforma = 'tiktok';
        else if (url.includes('facebook.com')) data.plataforma = 'facebook';

        res.json(data);
    } catch (e) {
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
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 },
            isMobile: true
        });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'load', timeout: 60000 });

        // Esperar un poco para que carguen elementos pesados
        await page.waitForTimeout(3000);

        const buffer = await page.screenshot({ type: 'png' });

        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
