/**
 * CLI entry point: --once or --schedule.
 */

import { loadEnv } from "./config/env.js";
import { runSync } from "./sync/engine.js";
import { logger } from "./sync/logger.js";

const args = process.argv.slice(2);
const once = args.includes("--once");
const schedule = args.includes("--schedule");

async function main(): Promise<void> {
  const env = loadEnv();
  logger.info("Playspace-Owl sync starting", {
    mode: once ? "once" : schedule ? "schedule" : "once",
    syncIntervalMinutes: env.SYNC_INTERVAL_MINUTES,
    logLevel: env.LOG_LEVEL,
  });

  if (schedule) {
    const intervalMs = env.SYNC_INTERVAL_MINUTES * 60 * 1000;
    const run = async (): Promise<void> => {
      try {
        await runSync();
      } catch (err) {
        logger.error("Scheduled sync failed", { error: err });
      }
    };
    await run();
    setInterval(run, intervalMs);
    return;
  }

  await runSync();
  process.exit(0);
}

function shutdown(): void {
  logger.info("Shutting down");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  logger.error("Fatal error", { error: err });
  process.exit(1);
});
