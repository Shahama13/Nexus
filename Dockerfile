FROM node:20-alpine AS base

# ---------- CLIENT BUILD STAGE ----------
FROM base AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- SERVER BUILD STAGE ----------
FROM base AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./

# ---------- PRODUCTION RUNNER ----------
FROM base AS runner
WORKDIR /app

COPY --from=server-builder /app/server ./server

COPY --from=client-builder /app/client/dist ./client/dist

WORKDIR /app/server

EXPOSE 3000

CMD ["node", "server.js"]
