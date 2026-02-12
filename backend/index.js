const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Infonavit Automation Backend is running (Scraper Edition)!');
});

// Helper para limpiar números (ej: "1.2M" -> 1200000)
function parseSocialNumber(str) {
    if (!str) return 0;
    let num = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (str.toLowerCase().includes('k')) num *= 1000;
    if (str.toLowerCase().includes('m')) num *= 1000000;
    if (str.toLowerCase().includes('b')) num *= 1000000000;
    return Math.floor(num);
}

// Endpoint para obtener información de seguidores y nombre
app.get('/api/social-info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        let data = { nombre: 'Desconocido', seguidores: 0, plataforma: 'otra' };

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            data.plataforma = 'youtube';
            try {
                // Selector para videos y shorts
                await page.waitForSelector('#owner-sub-count, yt-formatted-string#owner-sub-count', { timeout: 10000 });
                data.nombre = await page.$eval('ytd-video-owner-renderer #channel-name a, #text-container.ytd-channel-name a', el => el.innerText.trim());
                const subText = await page.$eval('#owner-sub-count, yt-formatted-string#owner-sub-count', el => el.innerText.trim());
                data.seguidores = parseSocialNumber(subText);
            } catch (e) {
                console.error("Error YT selectors:", e.message);
            }
        }
        else if (url.includes('instagram.com')) {
            data.plataforma = 'instagram';
            // Scrape simple via Meta tags (más estable para Reels/Posts)
            const content = await page.content();
            const metaMatch = content.match(/([0-9.,KMB]+)\s+(Followers|Seguidores)/i);
            if (metaMatch) data.seguidores = parseSocialNumber(metaMatch[1]);

            const title = await page.title();
            data.nombre = title.split('(@')[0].trim();
        }
        else if (url.includes('tiktok.com')) {
            data.plataforma = 'tiktok';
            try {
                // En TikTok el nombre está en [data-e2e="browse-username"] o similar en videos
                await page.waitForSelector('[data-e2e="browse-username"], [data-e2e="user-subtitle"]', { timeout: 10000 });
                data.nombre = await page.$eval('[data-e2e="browse-username"], [data-e2e="user-subtitle"]', el => el.innerText.trim());
                // Seguidores no siempre están en la página del video, pero intentamos meta o ir al perfil
                const content = await page.content();
                const followMatch = content.match(/\"followerCount\":([0-9]+)/);
                if (followMatch) data.seguidores = parseInt(followMatch[1]);
            } catch (e) { }
        }
        else if (url.includes('facebook.com')) {
            data.plataforma = 'facebook';
            const content = await page.content();
            const followMatch = content.match(/([0-9.,KMB]+)\s+followers/i) || content.match(/([0-9.,KMB]+)\s+seguidores/i);
            if (followMatch) data.seguidores = parseSocialNumber(followMatch[1]);
            data.nombre = await page.title().then(t => t.split('|')[0].trim());
        }

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        if (browser) await browser.close();
    }
});

// Endpoint para capturas
app.get('/api/screenshot', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = await browser.newContext({
            viewport: { width: 450, height: 800 },
            isMobile: true
        });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
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
