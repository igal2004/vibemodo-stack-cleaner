FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS app
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKUP_DIR=/data/backups
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/lib ./src/lib
COPY worker ./worker
COPY fixtures ./fixtures
COPY scripts ./scripts
EXPOSE 3000
VOLUME ["/data/backups"]
CMD ["node", "server/index.mjs"]
