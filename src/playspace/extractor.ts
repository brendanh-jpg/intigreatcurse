/**
 * PlaySpace data extraction via browser automation.
 * Login, extract clients, appointments, session notes.
 */

import type { Page } from "playwright";
import { loadEnv } from "../config/env.js";
import {
  waitAndClick,
  waitAndFill,
  waitForPageLoad,
  takeDebugScreenshot,
  retryAction,
} from "../browser/helpers.js";
import { PLAYSPACE_SELECTORS } from "./selectors.js";
import {
  type PlaySpaceExportData,
  type PlaySpaceClient,
  type PlaySpaceAppointment,
  type PlaySpaceSessionNote,
  PlaySpaceClientSchema,
  PlaySpaceAppointmentSchema,
  PlaySpaceSessionNoteSchema,
  PlaySpaceExportDataSchema,
} from "./types.js";
import { logger } from "../sync/logger.js";

const S = PLAYSPACE_SELECTORS;

async function loginToPlaySpace(page: Page): Promise<void> {
  const env = loadEnv();
  await page.goto(env.PLAYSPACE_URL, { waitUntil: "domcontentloaded" });
  await waitForPageLoad(page);

  const loginSelectors = [S.LOGIN.emailInput, S.LOGIN.passwordInput, S.LOGIN.submitButton];
  for (const sel of loginSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
    } catch {
      await takeDebugScreenshot(page, "playspace-login-form");
      throw new Error(`PlaySpace login: selector not found: ${sel}`);
    }
  }

  await waitAndFill(page, S.LOGIN.emailInput, env.PLAYSPACE_USERNAME);
  await waitAndFill(page, S.LOGIN.passwordInput, env.PLAYSPACE_PASSWORD);
  await waitAndClick(page, S.LOGIN.submitButton);

  await page.waitForSelector(S.LOGIN.dashboardIndicator, { timeout: 15000 }).catch(async () => {
    await takeDebugScreenshot(page, "playspace-after-login");
    throw new Error("PlaySpace login: dashboard not found after submit");
  });
  logger.info("PlaySpace login succeeded");
}

async function extractClients(page: Page, _since?: Date): Promise<PlaySpaceClient[]> {
  const clients: PlaySpaceClient[] = [];
  try {
    await page.waitForSelector(S.CLIENTS.listContainer, { timeout: 10000 });
  } catch {
    await takeDebugScreenshot(page, "playspace-clients-list");
    logger.warn("PlaySpace clients list container not found; returning empty list");
    return clients;
  }

  let hasNext = true;
  while (hasNext) {
    const rows = await page.$$(S.CLIENTS.clientRow);
    for (const row of rows) {
      try {
        const id = await row.getAttribute("data-id") ?? await row.getAttribute("data-client-id") ?? "";
        const nameCell = await row.$(S.CLIENTS.clientName);
        const emailCell = await row.$(S.CLIENTS.clientEmail);
        const phoneCell = await row.$(S.CLIENTS.clientPhone);
        const dobCell = await row.$(S.CLIENTS.clientDOB);

        const fullName = nameCell ? await nameCell.textContent() : "";
        const [firstName = "", lastName = ""] = (fullName ?? "").trim().split(/\s+/);
        const emailRaw = emailCell ? await emailCell.textContent() : null;
        const email = (emailRaw ?? "").trim();
        const phoneRaw = phoneCell ? await phoneCell.textContent() : null;
        const phone = (phoneRaw ?? "").trim();
        const dobRaw = dobCell ? await dobCell.textContent() : null;
        const dateOfBirth = (dobRaw ?? "").trim();

        const client: PlaySpaceClient = {
          id: id || `client-${clients.length}`,
          firstName: firstName || "Unknown",
          lastName: lastName || "Unknown",
          email: email || undefined,
          phone: phone || undefined,
          dateOfBirth: dateOfBirth || undefined,
        };
        const parsed = PlaySpaceClientSchema.safeParse(client);
        if (parsed.success) clients.push(parsed.data);
      } catch (err) {
        logger.debug("Skip client row", { error: err });
      }
    }

    try {
      const nextBtn = await page.$(`${S.CLIENTS.pagination} a[aria-label="Next"], ${S.CLIENTS.pagination} button:has-text("Next")`);
      if (!nextBtn || (await nextBtn.getAttribute("disabled")) !== null) {
        hasNext = false;
      } else {
        await nextBtn.click();
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch {
      hasNext = false;
    }
  }

  logger.info("PlaySpace clients extracted", { count: clients.length });
  return clients;
}

async function extractAppointments(page: Page): Promise<PlaySpaceAppointment[]> {
  const appointments: PlaySpaceAppointment[] = [];
  try {
    await page.waitForSelector(S.APPOINTMENTS.calendarView, { timeout: 10000 });
  } catch {
    await takeDebugScreenshot(page, "playspace-appointments");
    logger.warn("PlaySpace appointments view not found; returning empty list");
    return appointments;
  }

  const cards = await page.$$(S.APPOINTMENTS.appointmentCard);
  for (let i = 0; i < cards.length; i++) {
    try {
      const card = cards[i];
      const id = await card.getAttribute("data-id") ?? await card.getAttribute("data-appointment-id") ?? `appt-${i}`;
      const clientEl = await card.$(S.APPOINTMENTS.clientField);
      const clinicianEl = await card.$(S.APPOINTMENTS.clinicianField);
      const dateEl = await card.$(S.APPOINTMENTS.dateField);
      const timeEl = await card.$(S.APPOINTMENTS.timeField);
      const durationEl = await card.$(S.APPOINTMENTS.durationField);
      const statusEl = await card.$(S.APPOINTMENTS.statusField);
      const linkEl = await card.$(S.APPOINTMENTS.meetingLinkField);

      const clientId = clientEl ? (await clientEl.getAttribute("data-client-id")) ?? "" : "";
      const clinicianName = clinicianEl ? (await clinicianEl.textContent())?.trim() ?? "" : "";
      const dateVal = dateEl ? (await dateEl.getAttribute("value")) ?? (await dateEl.textContent())?.trim() ?? "" : "";
      const timeVal = timeEl ? (await timeEl.getAttribute("value")) ?? (await timeEl.textContent())?.trim() ?? "" : "";
      const durationStr = durationEl ? (await durationEl.textContent())?.trim() ?? "60" : "60";
      const status = statusEl ? (await statusEl.textContent())?.trim() ?? "" : "";
      const meetingLink = linkEl ? (await linkEl.getAttribute("value")) ?? (await linkEl.getAttribute("href")) ?? undefined : undefined;

      const dateTime = dateVal && timeVal ? `${dateVal}T${timeVal}` : new Date().toISOString();
      const duration = parseInt(durationStr, 10) || 60;

      const appt: PlaySpaceAppointment = {
        id: id as string,
        clientId: clientId || `client-${i}`,
        clinicianName: clinicianName || "Clinician",
        dateTime,
        duration,
        status,
        type: "session",
        meetingLink,
      };
      const parsed = PlaySpaceAppointmentSchema.safeParse(appt);
      if (parsed.success) appointments.push(parsed.data);
    } catch (err) {
      logger.debug("Skip appointment card", { error: err });
    }
  }

  logger.info("PlaySpace appointments extracted", { count: appointments.length });
  return appointments;
}

async function extractSessionNotes(page: Page): Promise<PlaySpaceSessionNote[]> {
  const notes: PlaySpaceSessionNote[] = [];
  try {
    await page.waitForSelector(S.SESSION_NOTES.notesList, { timeout: 10000 });
  } catch {
    await takeDebugScreenshot(page, "playspace-session-notes");
    logger.warn("PlaySpace session notes list not found; returning empty list");
    return notes;
  }

  const rows = await page.$$(S.SESSION_NOTES.noteRow);
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const id = await row.getAttribute("data-id") ?? `note-${i}`;
      const clientEl = await row.$(S.SESSION_NOTES.clientName);
      const clinicianEl = await row.$(S.SESSION_NOTES.clinicianName);
      const dateEl = await row.$(S.SESSION_NOTES.sessionDate);
      const durationEl = await row.$(S.SESSION_NOTES.sessionDuration);
      const contentEl = await row.$(S.SESSION_NOTES.noteContent);
      const activityEl = await row.$(S.SESSION_NOTES.activityData);

      const clientId = clientEl ? (await clientEl.getAttribute("data-client-id")) ?? "" : "";
      const clinicianName = clinicianEl ? (await clinicianEl.textContent())?.trim() ?? "" : "";
      const sessionDate = dateEl ? (await dateEl.textContent())?.trim() ?? "" : "";
      const durationStr = durationEl ? (await durationEl.textContent())?.trim() ?? "0" : "0";
      const noteContent = contentEl ? (await contentEl.textContent())?.trim() ?? "" : "";
      let activityData: Record<string, unknown> | undefined;
      if (activityEl) {
        try {
          const text = await activityEl.textContent();
          if (text) activityData = JSON.parse(text) as Record<string, unknown>;
        } catch {
          activityData = {};
        }
      }

      const note: PlaySpaceSessionNote = {
        id: id as string,
        clientId: clientId || `client-${i}`,
        clinicianName: clinicianName || "Clinician",
        sessionDate: sessionDate || new Date().toISOString().slice(0, 10),
        duration: parseInt(durationStr, 10) || 0,
        noteContent,
        activityData,
      };
      const parsed = PlaySpaceSessionNoteSchema.safeParse(note);
      if (parsed.success) notes.push(parsed.data);
    } catch (err) {
      logger.debug("Skip session note row", { error: err });
    }
  }

  logger.info("PlaySpace session notes extracted", { count: notes.length });
  return notes;
}

export async function extractAll(
  page: Page,
  since?: Date
): Promise<PlaySpaceExportData> {
  await retryAction(() => loginToPlaySpace(page));

  const [clients, appointments, sessionNotes] = await Promise.all([
    extractClients(page, since),
    extractAppointments(page),
    extractSessionNotes(page),
  ]);

  const data: PlaySpaceExportData = {
    clients,
    appointments,
    sessionNotes,
    extractedAt: new Date().toISOString(),
  };

  const result = PlaySpaceExportDataSchema.safeParse(data);
  if (!result.success) {
    logger.error("PlaySpace export validation failed", { error: result.error });
    throw new Error("PlaySpace export validation failed");
  }
  return result.data;
}
