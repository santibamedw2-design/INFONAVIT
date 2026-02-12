const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ruta base para verificar que el servidor está vivo
app.get('/', (req, res) => {
  res.send('Infonavit Automation Backend is running!');
});

// Endpoint para obtener información de seguidores y nombre
app.get('/api/social-info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    let data = { nombre: 'Desconocido', seguidores: 0, plataforma: 'otra' };

    // Lógica de scraping simplificada (ejemplo para IG)
    if (url.includes('instagram.com')) {
      data.plataforma = 'instagram';
      // Intentar extraer nombre del perfil si es posible
    } else if (url.includes('tiktok.com')) {
      data.plataforma = 'tiktok';
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Endpoint para tomar capturas de pantalla
app.get('/api/screenshot', async (req, res) => {
  const { url, type } = req.query; // type: 'post' o 'metrics'
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Ajustar viewport para simular móvil si es necesario
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto(url, { waitUntil: 'networkidle' });

    // Esperar un poco para que carguen elementos dinámicos
    await page.waitForTimeout(2000);

    const buffer = await page.screenshot({ fullPage: false });

    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
