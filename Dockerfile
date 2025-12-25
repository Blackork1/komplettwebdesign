# apps/komplettwebdesign/Dockerfile
FROM node:20-alpine

# Arbeitsverzeichnis
WORKDIR /usr/src/app

# Nur package.json und package-lock.json kopieren, um docker-Layer-Caching zu nutzen
COPY package*.json ./

# Abhängigkeiten installieren
RUN npm install --omit=dev

# Rest des Codes kopieren
COPY . .

# Port freigeben
EXPOSE 3000

# Startbefehl
CMD ["npm", "start"]


