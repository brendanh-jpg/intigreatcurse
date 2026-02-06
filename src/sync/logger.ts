/**
 * Winston structured logging for SOC 2 compliance.
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const LOG_DIR = join(process.cwd(), "logs");

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

async function ensureLogDir(): Promise<void> {
  await mkdir(LOG_DIR, { recursive: true });
}

let defaultLogger: winston.Logger | null = null;

function getDefaultLogger(): winston.Logger {
  if (defaultLogger) return defaultLogger;
  defaultLogger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: jsonFormat,
    defaultMeta: { service: "playspace-owl-sync" },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
  ensureLogDir().then(() => {
    if (!defaultLogger) return;
    defaultLogger.add(
      new DailyRotateFile({
        dirname: LOG_DIR,
        filename: "sync-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        maxFiles: "7d",
        format: jsonFormat,
      })
    );
    defaultLogger.add(
      new DailyRotateFile({
        dirname: LOG_DIR,
        filename: "error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        maxFiles: "7d",
        level: "error",
        format: jsonFormat,
      })
    );
  });
  return defaultLogger;
}

export const logger = getDefaultLogger();

export function createSyncLogger(
  syncRunId: string,
  sessionId: string
): winston.Logger {
  return getDefaultLogger().child({
    syncRunId,
    browserbaseSessionId: sessionId,
  });
}

export interface SyncResultLog {
  success: boolean;
  recordType: string;
  recordId?: string;
  owlId?: string | undefined;
  error?: string | undefined;
}

export function logSyncSummary(results: SyncResultLog[]): void {
  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);
  const byType = results.reduce(
    (acc, r) => {
      acc[r.recordType] = (acc[r.recordType] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  logger.info("Sync summary", {
    total: results.length,
    success,
    failed: failed.length,
    byType,
    errors: failed.map((r) => ({ recordType: r.recordType, recordId: r.recordId, error: r.error })),
  });
}
