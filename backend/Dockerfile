# Usar la imagen oficial de Playwright que ya tiene todas las librerías instaladas
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para arrancar
CMD [ "node", "index.js" ]
