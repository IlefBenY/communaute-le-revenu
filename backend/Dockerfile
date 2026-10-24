FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .
# Compile le TypeScript et le panneau d'administration.
RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
