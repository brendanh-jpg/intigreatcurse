/**
 * Optional HTTP trigger for n8n: POST /trigger runs one sync, GET /health and GET /status.
 */

import express, { type Request, type Response } from "express";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runSync } from "./sync/engine.js";
import { logger } from "./sync/logger.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

let lastSyncTimestamp: string | null = null;
let lastSyncSummary: { clientsSynced: number; appointmentsSynced: number; notesSynced: number; linksSynced: number; errors: number } | null = null;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    lastSync: lastSyncTimestamp,
  });
});

app.get("/status", async (_req: Request, res: Response) => {
  try {
    const dataDir = join(process.cwd(), "data");
    const statePath = join(dataDir, "sync-state.json");
    const data = await readFile(statePath, "utf-8").catch(() => "{}");
    const state = JSON.parse(data) as { lastSyncTimestamp?: string };
    res.json({
      lastSyncTimestamp: state.lastSyncTimestamp ?? lastSyncTimestamp,
      lastRunSummary: lastSyncSummary,
    });
  } catch {
    res.json({
      lastSyncTimestamp,
      lastRunSummary: lastSyncSummary,
    });
  }
});

app.post("/trigger", async (_req: Request, res: Response) => {
  logger.info("Trigger: sync requested via HTTP");
  try {
    const summary = await runSync();
    lastSyncTimestamp = new Date().toISOString();
    lastSyncSummary = summary;
    res.json({
      success: true,
      summary,
      timestamp: lastSyncTimestamp,
    });
  } catch (err) {
    logger.error("Trigger: sync failed", { error: err });
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

app.listen(PORT, () => {
  logger.info("Trigger server listening", { port: PORT });
});
