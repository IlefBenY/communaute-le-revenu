FROM node:22-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .

EXPOSE 3000
# Le build prérend le shell statique des pages à partir des données Strapi :
# il est donc lancé au démarrage, une fois Strapi disponible (voir depends_on).
CMD ["sh", "-c", "npm run build && npm run start -- -H 0.0.0.0 -p 3000"]
