/**
 * Core sync orchestration: extract from PlaySpace, map, dedup, push to Owl.
 */

import { randomUUID } from "node:crypto";
import { withSession } from "../browser/session.js";
import { loadEnv } from "../config/env.js";
import { extractAll } from "../playspace/extractor.js";
import { loginToOwl } from "../owl/auth.js";
import { syncClient } from "../owl/clients.js";
import { syncAppointment } from "../owl/appointments.js";
import { syncSessionNote } from "../owl/session-notes.js";
import { syncMeetingLink } from "../owl/meeting-links.js";
import {
  loadSyncState,
  saveSyncState,
  computeHash,
  shouldSync,
  recordSynced,
  getClientIdMap,
  getAppointmentIdMap,
  type SyncState,
} from "./dedup.js";
import { createSyncLogger, logSyncSummary } from "./logger.js";
import {
  mapClient,
  mapAppointment,
  mapSessionNote,
  mapMeetingLink,
} from "./mapper.js";
import type { SyncResult } from "../owl/types.js";

const CIRCUIT_BREAKER_THRESHOLD = 3;

export interface SyncSummary {
  clientsSynced: number;
  appointmentsSynced: number;
  notesSynced: number;
  linksSynced: number;
  errors: number;
}

export async function runSync(): Promise<SyncSummary> {
  const runId = randomUUID();
  const summary: SyncSummary = {
    clientsSynced: 0,
    appointmentsSynced: 0,
    notesSynced: 0,
    linksSynced: 0,
    errors: 0,
  };

  await withSession(async (session) => {
    const { page, sessionId } = session;
    const syncLog = createSyncLogger(runId, sessionId);
    syncLog.info("Sync run started", { runId, sessionId });

    let state: SyncState = await loadSyncState();
    const lastSince = state.lastSyncTimestamp
      ? new Date(state.lastSyncTimestamp)
      : undefined;

    const env = loadEnv();

    try {
      await page.goto(env.PLAYSPACE_URL, { waitUntil: "domcontentloaded" });
      const playspaceData = await extractAll(page, lastSince);
      syncLog.info("PlaySpace extraction complete", {
        clients: playspaceData.clients.length,
        appointments: playspaceData.appointments.length,
        sessionNotes: playspaceData.sessionNotes.length,
      });

      await loginToOwl(page);

      const results: SyncResult[] = [];
      let consecutiveFailures = 0;

      for (const client of playspaceData.clients) {
        const hash = computeHash(client);
        const action = shouldSync(state, "clientMap", client.id, hash);
        if (action === "skip") {
          continue;
        }
        try {
          const owlClient = mapClient(client);
          const result = await syncClient(page, owlClient, client.id);
          results.push(result);
          if (result.success && result.owlId) {
            recordSynced(state, "clientMap", client.id, result.owlId, hash);
            summary.clientsSynced++;
            consecutiveFailures = 0;
          } else {
            summary.errors++;
            consecutiveFailures++;
          }
        } catch (err) {
          syncLog.error("Client sync failed", { clientId: client.id, error: err });
          summary.errors++;
          consecutiveFailures++;
        }
        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
          syncLog.warn("Circuit breaker: too many consecutive failures");
          break;
        }
      }

      const clientIdMap = getClientIdMap(state);

      for (const appt of playspaceData.appointments) {
        const hash = computeHash(appt);
        const action = shouldSync(state, "appointmentMap", appt.id, hash);
        if (action === "skip") continue;
        try {
          const owlAppt = mapAppointment(appt, clientIdMap);
          const result = await syncAppointment(
            page,
            owlAppt,
            clientIdMap,
            appt.id
          );
          results.push(result);
          if (result.success && result.owlId) {
            recordSynced(state, "appointmentMap", appt.id, result.owlId, hash);
            summary.appointmentsSynced++;
            consecutiveFailures = 0;
          } else {
            summary.errors++;
            consecutiveFailures++;
          }
        } catch (err) {
          syncLog.error("Appointment sync failed", { apptId: appt.id, error: err });
          summary.errors++;
          consecutiveFailures++;
        }
        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) break;
      }

      const appointmentIdMap = getAppointmentIdMap(state);

      for (const note of playspaceData.sessionNotes) {
        const hash = computeHash(note);
        const action = shouldSync(state, "sessionNoteMap", note.id, hash);
        if (action === "skip") continue;
        try {
          const owlNote = mapSessionNote(note, clientIdMap, appointmentIdMap);
          const result = await syncSessionNote(
            page,
            owlNote,
            clientIdMap,
            appointmentIdMap
          );
          result.playspaceId = note.id;
          results.push(result);
          if (result.success) {
            recordSynced(
              state,
              "sessionNoteMap",
              note.id,
              result.owlId ?? note.id,
              hash
            );
            summary.notesSynced++;
            consecutiveFailures = 0;
          } else {
            summary.errors++;
            consecutiveFailures++;
          }
        } catch (err) {
          syncLog.error("Session note sync failed", { noteId: note.id, error: err });
          summary.errors++;
          consecutiveFailures++;
        }
        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) break;
      }

      for (const appt of playspaceData.appointments) {
        const linkInput = mapMeetingLink(appt, appointmentIdMap);
        if (!linkInput) continue;
        const hash = computeHash(linkInput);
        const action = shouldSync(
          state,
          "meetingLinkMap",
          `${appt.id}-link`,
          hash
        );
        if (action === "skip") continue;
        try {
          const result = await syncMeetingLink(page, linkInput, appointmentIdMap);
          result.playspaceId = appt.id;
          results.push(result);
          if (result.success) {
            recordSynced(
              state,
              "meetingLinkMap",
              `${appt.id}-link`,
              linkInput.appointmentId,
              hash
            );
            summary.linksSynced++;
            consecutiveFailures = 0;
          } else {
            summary.errors++;
          }
        } catch (err) {
          syncLog.error("Meeting link sync failed", { apptId: appt.id, error: err });
          summary.errors++;
        }
      }

      state.lastSyncTimestamp = new Date().toISOString();
      await saveSyncState(state);

      logSyncSummary(
        results.map((r) => {
          const entry: { success: boolean; recordType: string; recordId?: string; owlId?: string; error?: string } = {
            success: r.success,
            recordType: r.recordType,
            recordId: r.playspaceId,
          };
          if (r.owlId !== undefined) entry.owlId = r.owlId;
          if (r.error !== undefined) entry.error = r.error;
          return entry;
        })
      );
      syncLog.info("Sync run complete", summary);
    } catch (err) {
      syncLog.error("Sync run failed", { error: err });
      throw err;
    }
  });

  return summary;
}
