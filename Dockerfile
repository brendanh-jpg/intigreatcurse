# PlaySpace → Owl Practice Sync
# Playwright runs in Browserbase (remote); we only need the npm package locally.
FROM node:20-slim

WORKDIR /app

# Install Playwright deps only if needed for local fallback (optional)
# npx playwright install-deps chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .
RUN npm run build

VOLUME /app/logs
VOLUME /app/data
VOLUME /app/debug

ENV NODE_ENV=production
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--once"]
