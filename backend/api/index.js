const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Infonavit Automation Backend is running (Puppeteer Edition)!');
});

async function getBrowser() {
  return await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}

app.get('/api/social-info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    let data = { nombre: 'Desconocido', seguidores: 0, plataforma: 'otra' };
    if (url.includes('instagram.com')) data.plataforma = 'instagram';
    else if (url.includes('tiktok.com')) data.plataforma = 'tiktok';

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
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Esperar a que cargue el contenido dinámico
    await new Promise(r => setTimeout(r, 2000));

    const buffer = await page.screenshot({ type: 'png' });

    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = app;
