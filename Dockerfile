# apps/komplettwebdesign/Dockerfile
FROM node:20-alpine

# Arbeitsverzeichnis
WORKDIR /usr/src/app

# Nur package.json und package-lock.json kopieren, um docker-Layer-Caching zu nutzen
COPY package*.json ./

# Abhängigkeiten installieren. Dev-Abhängigkeiten werden für den CSS-Build gebraucht.
RUN npm install

# Rest des Codes kopieren
COPY . .

RUN npm run build:css
RUN npm prune --omit=dev

# Port freigeben
EXPOSE 3000

# Startbefehl
CMD ["npm", "start"]

