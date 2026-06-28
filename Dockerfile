
FROM node:20 AS base

# ---------- CLIENT BUILD STAGE ----------
FROM base AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---------- SERVER BUILD STAGE ----------
FROM base AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./

# ---------- PRODUCTION RUNNER ----------
FROM base AS runner
# RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=server-builder /app/server ./server

COPY --from=client-builder /app/client/dist ./client/dist

WORKDIR /app/server

EXPOSE 3000

CMD ["node", "server.js"]
