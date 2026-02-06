/**
 * Idempotency and deduplication via local sync-state.json.
 */

import { z } from "zod";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const RecordStateSchema = z.object({
  owlId: z.string(),
  contentHash: z.string(),
  lastSynced: z.string(),
});

const SyncStateSchema = z.object({
  lastSyncTimestamp: z.string(),
  clientMap: z.record(z.string(), RecordStateSchema),
  appointmentMap: z.record(z.string(), RecordStateSchema),
  sessionNoteMap: z.record(z.string(), RecordStateSchema),
  meetingLinkMap: z.record(z.string(), RecordStateSchema),
});

export type SyncState = z.infer<typeof SyncStateSchema>;
export type RecordState = z.infer<typeof RecordStateSchema>;

const DEFAULT_STATE: SyncState = {
  lastSyncTimestamp: "",
  clientMap: {},
  appointmentMap: {},
  sessionNoteMap: {},
  meetingLinkMap: {},
};

const STATE_FILENAME = "sync-state.json";

function statePath(basePath?: string): string {
  const dataDir = basePath ?? join(process.cwd(), "data");
  return join(dataDir, STATE_FILENAME);
}

export async function loadSyncState(basePath?: string): Promise<SyncState> {
  const path = statePath(basePath);
  try {
    const data = await readFile(path, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    const result = SyncStateSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // File missing or invalid — return default
  }
  return { ...DEFAULT_STATE };
}

export async function saveSyncState(
  state: SyncState,
  basePath?: string
): Promise<void> {
  const path = statePath(basePath);
  const dataDir = basePath ?? join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });
  const tempPath = path + ".tmp." + Date.now();
  await writeFile(tempPath, JSON.stringify(state, null, 2), "utf-8");
  const { rename } = await import("node:fs/promises");
  await rename(tempPath, path);
}

export function computeHash(record: unknown): string {
  const normalized = JSON.stringify(record, Object.keys(record as object).sort());
  return createHash("sha256").update(normalized).digest("hex");
}

export type RecordType = keyof Omit<SyncState, "lastSyncTimestamp">;

function getMap(
  state: SyncState,
  recordType: RecordType
): Record<string, RecordState> {
  switch (recordType) {
    case "clientMap":
      return state.clientMap;
    case "appointmentMap":
      return state.appointmentMap;
    case "sessionNoteMap":
      return state.sessionNoteMap;
    case "meetingLinkMap":
      return state.meetingLinkMap;
    default:
      return {};
  }
}

export function shouldSync(
  state: SyncState,
  recordType: RecordType,
  playspaceId: string,
  currentHash: string
): "new" | "updated" | "skip" {
  const map = getMap(state, recordType);
  const existing = map[playspaceId];
  if (!existing) return "new";
  if (existing.contentHash !== currentHash) return "updated";
  return "skip";
}

export function recordSynced(
  state: SyncState,
  recordType: RecordType,
  playspaceId: string,
  owlId: string,
  hash: string
): void {
  const map = getMap(state, recordType);
  map[playspaceId] = {
    owlId,
    contentHash: hash,
    lastSynced: new Date().toISOString(),
  };
}

export function getOwlId(
  state: SyncState,
  recordType: RecordType,
  playspaceId: string
): string | null {
  const map = getMap(state, recordType);
  return map[playspaceId]?.owlId ?? null;
}

export function getClientIdMap(state: SyncState): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(state.clientMap)) m.set(k, v.owlId);
  return m;
}

export function getAppointmentIdMap(state: SyncState): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(state.appointmentMap)) m.set(k, v.owlId);
  return m;
}
