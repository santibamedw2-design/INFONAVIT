const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Infonavit Automation Backend is running (Advanced Scraper V3)!');
});

// Helper para limpiar números (ej: "1.2M" -> 1200000)
function parseSocialNumber(str) {
    if (!str) return 0;
    let clean = str.replace(/,/g, '').match(/[0-9.]+[KMBkmb]?/);
    if (!clean) return 0;

    let valStr = clean[0].toUpperCase();
    let num = parseFloat(valStr.replace(/[KMB]/g, ''));

    if (valStr.includes('K')) num *= 1000;
    if (valStr.includes('M')) num *= 1000000;
    if (valStr.includes('B')) num *= 1000000000;

    return Math.floor(num);
}

// Helper para formatear fecha a dd/mm
function formatDateToDDMM(isoString) {
    if (!isoString) return null;
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return null;
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}`;
    } catch (e) {
        return null;
    }
}

app.get('/api/social-info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 }
        });

        const page = await context.newPage();
        console.log(`Scraping: ${url}`);

        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(3000);

        let data = {
            nombre: 'Desconocido',
            seguidores: 0,
            visualizaciones: 0,
            interacciones: 0,
            fecha_publicacion: null,
            plataforma: 'otra'
        };

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            data.plataforma = 'youtube';
            try {
                data.nombre = await page.$eval('#channel-name a, .ytd-video-owner-renderer #text a', el => el.innerText.trim()).catch(() => 'Youtube Channel');
                data.visualizaciones = parseSocialNumber(await page.$eval('.view-count', el => el.innerText).catch(() => '0'));
                data.interacciones = parseSocialNumber(await page.$eval('button[aria-label*="like"]', el => el.getAttribute('aria-label')).catch(() => '0'));

                // Fecha en YT suele estar en un span de #info-text
                const dateText = await page.$eval('#info-text span:last-child', el => el.innerText).catch(() => '');
                // YT date format varies, but we try to find something like "Feb 12, 2026"
                const dateMatch = dateText.match(/([A-Z][a-z]{2})\s(\d{1,2}),\s(\d{4})/);
                if (dateMatch) {
                    const dateObj = new Date(dateText);
                    data.fecha_publicacion = formatDateToDDMM(dateObj.toISOString());
                }
            } catch (e) { }
        }
        else if (url.includes('instagram.com')) {
            data.plataforma = 'instagram';
            const content = await page.content();

            const title = await page.title();
            data.nombre = title.includes('(@') ? title.split('(@')[0].trim() : title.split('•')[0].trim();

            const folMatch = content.match(/\"edge_followed_by\":\{\"count\":([0-9]+)\}/);
            if (folMatch) data.seguidores = parseInt(folMatch[1]);

            const viewMatch = content.match(/\"video_view_count\":([0-9]+)/);
            if (viewMatch) data.visualizaciones = parseInt(viewMatch[1]);

            const likeMatch = content.match(/\"edge_media_preview_like\":\{\"count\":([0-9]+)\}/);
            if (likeMatch) data.interacciones = parseInt(likeMatch[1]);

            const dateMatch = content.match(/\"taken_at_timestamp\":([0-9]+)/);
            if (dateMatch) {
                const dateObj = new Date(parseInt(dateMatch[1]) * 1000);
                data.fecha_publicacion = formatDateToDDMM(dateObj.toISOString());
            }
        }
        else if (url.includes('tiktok.com')) {
            data.plataforma = 'tiktok';
            try {
                data.nombre = await page.$eval('[data-e2e="browse-username"], [data-e2e="user-subtitle"]', el => el.innerText.trim()).catch(() => 'TikTok User');
                const content = await page.content();
                data.seguidores = parseInt(content.match(/\"followerCount\":([0-9]+)/)?.[1] || '0');
                data.visualizaciones = parseInt(content.match(/\"playCount\":([0-9]+)/)?.[1] || '0');
                data.interacciones = parseInt(content.match(/\"diggCount\":([0-9]+)/)?.[1] || '0');

                const createTime = content.match(/\"createTime\":([0-9]+)/);
                if (createTime) {
                    const dateObj = new Date(parseInt(createTime[1]) * 1000);
                    data.fecha_publicacion = formatDateToDDMM(dateObj.toISOString());
                }
            } catch (e) { }
        }
        else if (url.includes('facebook.com')) {
            data.plataforma = 'facebook';
            data.nombre = await page.title().then(t => t.split('|')[0].replace('Log into Facebook', '').trim()) || 'Facebook Page';
            // FB metrics are hard to scrape without login, but we check common meta/text
            const content = await page.content();
            data.seguidores = parseSocialNumber(content.match(/([0-9.,KMB]+)\s+(followers|seguidores)/i)?.[1]);
        }
        else if (url.includes('twitter.com') || url.includes('x.com')) {
            data.plataforma = 'x';
            data.nombre = await page.title().then(t => t.split('on X')[0].trim());
            try {
                const timeTag = await page.$eval('time', el => el.getAttribute('datetime'));
                data.fecha_publicacion = formatDateToDDMM(timeTag);
            } catch (e) { }
        }
        else if (url.includes('threads.net')) {
            data.plataforma = 'threads';
            data.nombre = await page.title().then(t => t.split('(@')[0].trim());
        }

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.get('/api/screenshot', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser;
    try {
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true });
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
