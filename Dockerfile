# Portable container image, so the app is not tied to any one host.
# Works on Oracle Cloud, Google Cloud Run, a plain VPS, or Render's Docker runtime.

# --- build ------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 ships prebuilt binaries for this platform, but keep a toolchain
# available so npm can fall back to compiling from source rather than failing.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# next build imports the auth config, which requires a secret to be present.
# This value never reaches the running container — the real one is injected at
# runtime by the host.
ENV AUTH_SECRET=build-only-placeholder-not-used-at-runtime
RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Mount a volume here to make the vault survive restarts. Without one the
# container reseeds from data/seed.json on every boot, which is the intended
# behaviour for a demo.
ENV DATABASE_PATH=/data/monolith.db

# node_modules carries the better-sqlite3 native binary compiled in the build
# stage — same base image, so the ABI matches.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/data ./data
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
CMD ["npx", "next", "start"]
