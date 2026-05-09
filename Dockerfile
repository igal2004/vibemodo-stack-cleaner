FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production
ENV BACKUP_DIR=/data/backups
COPY package*.json ./
RUN npm ci --omit=dev
COPY worker ./worker
COPY fixtures ./fixtures
COPY scripts ./scripts
VOLUME ["/data/backups"]
CMD ["node", "worker/liquid-worker.mjs"]
