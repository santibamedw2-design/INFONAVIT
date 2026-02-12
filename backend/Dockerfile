# Usar la imagen de Playwright como base
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node
RUN npm install

# FORZAR la instalación del navegador Chromium exacto que pide la versión de npm
# Esto soluciona el error "Executable doesn't exist"
RUN npx playwright install chromium

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Variable de entorno para que Playwright sepa dónde buscar (opcional pero recomendado)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Comando para arrancar
CMD [ "node", "index.js" ]
