# Infonavit Automation Backend

Este es el servicio backend que maneja las tareas que Google Apps Script no puede hacer por sí solo:
1. Tomar capturas de pantalla de publicaciones.
2. Extraer datos (seguidores, nombres) saltando bloqueos de CORS.

## Requisitos
- Node.js 18+
- Playwright (para screenshots)
- Express

## Instrucciones de Despliegue (Vercel)
1. Conecta este repositorio a Vercel.
2. Vercel detectará automáticamente que es un proyecto de Node.js.
3. Asegúrate de que el comando de instalación incluya los binarios de Playwright.

## Variables de Entorno
- `API_KEY`: Una clave sencilla para que solo tu Apps Script pueda llamar a este servicio.
- `YT_API_KEY`: (Opcional) Para obtener datos de Youtube sin scraping.
