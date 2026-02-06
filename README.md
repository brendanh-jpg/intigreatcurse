# PlaySpace → Owl Practice Sync

One-directional browser-automated sync from **PlaySpace Health** (pediatric digital therapy) to **Owl Practice** (therapist EHR). No Owl API — all interactions use Playwright in Browserbase cloud sessions.

## Tech Stack

- TypeScript (strict), Node.js 20+
- Playwright + Browserbase SDK
- Zod, Winston, dotenv

## Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Copy env and fill in secrets:
   ```bash
   cp .env.example .env
   ```

3. Build:
   ```bash
   npm run build
   ```

## Running Locally

- **One-off sync:** `npm run sync` (or `tsx src/index.ts --once`)
- **Scheduled sync:** `npm run sync:schedule` (runs every `SYNC_INTERVAL_MINUTES`)
- **Dev watch:** `npm run dev`
- **HTTP trigger server:** `npm run trigger` (see below)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run sync` | Run one sync cycle |
| `npm run sync:schedule` | Run on interval (uses `SYNC_INTERVAL_MINUTES`) |
| `npm run dev` | Watch and run once on change |
| `npm run trigger` | Start HTTP server for n8n triggers |
| `npm run build` | Compile TypeScript to `dist/` |

## Deploy with Docker

1. Build and run with docker-compose:
   ```bash
   docker-compose up -d
   ```
   This runs one sync at startup (`--once`). Logs go to `./logs`, sync state to `./data`, debug screenshots to `./debug`.

2. Run on a schedule instead: override the command:
   ```bash
   docker-compose run -e SYNC_INTERVAL_MINUTES=60 sync node dist/index.js --schedule
   ```
   Or set `command: node dist/index.js --schedule` in `docker-compose.yml`.

3. Volumes: `./logs`, `./data`, and `./debug` are mounted so data persists across restarts.

## Triggering from n8n

Run the trigger server (e.g. on your Hostinger VPS):

```bash
npm run trigger
# or: node dist/trigger.js
```

Then from n8n:

- **POST** `http://your-server:3000/trigger` — runs one sync cycle and returns a JSON summary.
- **GET** `http://your-server:3000/health` — returns `{ status: "ok", lastSync: "<iso timestamp>" }`.
- **GET** `http://your-server:3000/status` — returns last sync timestamp and last run summary.

Use an n8n HTTP Request node to POST to `/trigger` on a schedule or webhook.

## Project Layout

- `src/browser/` — Browserbase session + Playwright helpers
- `src/playspace/` — PlaySpace extraction (selectors, types, extractor)
- `src/owl/` — Owl Practice push (auth, clients, appointments, notes, meeting links)
- `src/sync/` — Engine, mapper, dedup, logger
- `src/config/` — Zod-validated env

## Sync Order

1. Clients  
2. Appointments  
3. Session notes  
4. Meeting links  

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BROWSERBASE_API_KEY` | Browserbase API key |
| `BROWSERBASE_PROJECT_ID` | Browserbase project ID |
| `OWL_PRACTICE_URL` | Owl Practice base URL (e.g. https://app.owlpractice.ca) |
| `OWL_USERNAME` | Owl Practice login email |
| `OWL_PASSWORD` | Owl Practice password |
| `PLAYSPACE_URL` | PlaySpace Health base URL |
| `PLAYSPACE_USERNAME` | PlaySpace login email |
| `PLAYSPACE_PASSWORD` | PlaySpace password |
| `SYNC_INTERVAL_MINUTES` | Interval when using `--schedule` (default 60) |
| `LOG_LEVEL` | error \| warn \| info \| debug (default info) |

See `.env.example` for a full template.
