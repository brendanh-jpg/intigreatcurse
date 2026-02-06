/**
 * Create appointments in Owl Practice via browser automation.
 */

import type { Page } from "playwright";
import type { OwlAppointmentInput, SyncResult } from "./types.js";
import {
  waitAndClick,
  waitForPageLoad,
  selectDropdownOption,
  takeDebugScreenshot,
} from "../browser/helpers.js";
import { OWL_SELECTORS } from "./selectors.js";
import { logger } from "../sync/logger.js";

const S = OWL_SELECTORS;

function parseDateTime(dateTime: string): { date: string; time: string } {
  const d = new Date(dateTime);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

export async function syncAppointment(
  page: Page,
  appointment: OwlAppointmentInput,
  _clientIdMap: Map<string, string>,
  playspaceAppointmentId?: string
): Promise<SyncResult> {
  const log = logger.child({ action: "syncAppointment" });
  const result: SyncResult = {
    success: false,
    recordType: "appointment",
    playspaceId: playspaceAppointmentId ?? "",
  };

  try {
    await page.waitForSelector(S.NAVIGATION.calendarNav, { timeout: 5000 });
    await waitAndClick(page, S.NAVIGATION.calendarNav);
    await waitForPageLoad(page);

    await waitAndClick(page, S.APPOINTMENTS.newButton);
    await page.waitForSelector(S.APPOINTMENTS.form.clientSelect, { timeout: 10000 }).catch(async () => {
      await takeDebugScreenshot(page, "owl-appointment-form");
      throw new Error("Owl appointment form not found");
    });

    try {
      await selectDropdownOption(page, S.APPOINTMENTS.form.clientSelect, appointment.clientId);
    } catch {
      await page.selectOption(S.APPOINTMENTS.form.clientSelect, { label: appointment.clientId }).catch(() => null);
    }

    const clinicianSelect = await page.$(S.APPOINTMENTS.form.clinicianSelect);
    if (clinicianSelect) {
      try {
        await page.selectOption(S.APPOINTMENTS.form.clinicianSelect, { label: appointment.clinicianName });
      } catch {
        await page.fill(S.APPOINTMENTS.form.clinicianSelect, appointment.clinicianName);
      }
    }

    const { date, time } = parseDateTime(appointment.dateTime);
    const datePicker = await page.$(S.APPOINTMENTS.form.datePicker);
    if (datePicker) {
      await datePicker.fill(date);
    }
    const timePicker = await page.$(S.APPOINTMENTS.form.timePicker);
    if (timePicker) {
      await timePicker.fill(time);
    }
    await page.fill(S.APPOINTMENTS.form.durationInput, String(appointment.duration));

    const typeSelect = await page.$(S.APPOINTMENTS.form.typeSelect);
    if (typeSelect) {
      try {
        await page.selectOption(S.APPOINTMENTS.form.typeSelect, { label: appointment.type });
      } catch {
        await page.fill(S.APPOINTMENTS.form.typeSelect, appointment.type);
      }
    }

    if (appointment.meetingLink) {
      const linkField = await page.$(S.APPOINTMENTS.form.meetingLinkField);
      if (linkField) await linkField.fill(appointment.meetingLink);
      else {
        const notesField = await page.$(S.APPOINTMENTS.form.notesField);
        if (notesField) {
          const current = (await notesField.inputValue()) || "";
          await notesField.fill(current + "\n\nVirtual Session Link: " + appointment.meetingLink);
        }
      }
    }
    if (appointment.notes) {
      await page.fill(S.APPOINTMENTS.form.notesField, appointment.notes);
    }

    await waitAndClick(page, S.APPOINTMENTS.form.saveButton);
    await waitForPageLoad(page);

    const url = page.url();
    const idMatch = url.match(/[\w-]+$/);
    result.success = true;
    result.owlId = idMatch ? idMatch[0] : undefined;
    if (playspaceAppointmentId) result.playspaceId = playspaceAppointmentId;
    log.info("Created Owl appointment", { owlId: result.owlId });
    return result;
  } catch (err) {
    log.error("syncAppointment failed", { error: err });
    result.error = err instanceof Error ? err.message : String(err);
    await takeDebugScreenshot(page, "owl-appointment-error");
    return result;
  }
}
