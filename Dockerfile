# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install backend deps (cached on lockfile changes)
COPY package*.json ./
RUN npm ci

# Install frontend deps
COPY web/package*.json ./web/
RUN npm --prefix web ci

# Copy sources and build both frontend (web/dist) and backend (dist)
COPY . .
RUN npm run build:web && npm run build:server

# Prune to production backend deps
RUN npm prune --omit=dev

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/package.json ./package.json

# Writable receipt store
RUN mkdir -p /app/.data && chown -R node:node /app/.data
VOLUME /app/.data

USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
