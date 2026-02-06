/**
 * Attach meeting links to appointments in Owl Practice.
 */

import type { Page } from "playwright";
import type { OwlMeetingLinkInput, SyncResult } from "./types.js";
import { waitForPageLoad, takeDebugScreenshot } from "../browser/helpers.js";
import { OWL_SELECTORS } from "./selectors.js";
import { logger } from "../sync/logger.js";

const S = OWL_SELECTORS;

export async function syncMeetingLink(
  page: Page,
  link: OwlMeetingLinkInput,
  _appointmentIdMap: Map<string, string>
): Promise<SyncResult> {
  const log = logger.child({ action: "syncMeetingLink", appointmentId: link.appointmentId });
  const result: SyncResult = {
    success: false,
    recordType: "meetingLink",
    playspaceId: link.appointmentId,
  };

  try {
    const baseUrl = page.url().replace(/\/[^/]*$/, "");
    await page.goto(`${baseUrl}/${link.appointmentId}`, { waitUntil: "domcontentloaded" }).catch(() => null);
    await waitForPageLoad(page);

    const linkField = await page.$(S.APPOINTMENTS.form.meetingLinkField);
    if (linkField) {
      await linkField.fill(link.meetingLink);
      const saveBtn = await page.$(S.APPOINTMENTS.form.saveButton);
      if (saveBtn) await saveBtn.click();
      await waitForPageLoad(page);
      result.success = true;
      result.owlId = link.appointmentId;
      log.info("Saved meeting link to Owl appointment");
      return result;
    }

    const notesField = await page.$(S.APPOINTMENTS.form.notesField);
    if (notesField) {
      const current = (await notesField.inputValue()) || "";
      await notesField.fill(current + "\n\nVirtual Session Link: " + link.meetingLink);
      const saveBtn = await page.$(S.APPOINTMENTS.form.saveButton);
      if (saveBtn) await saveBtn.click();
      await waitForPageLoad(page);
      result.success = true;
      result.owlId = link.appointmentId;
      log.info("Appended meeting link to Owl appointment notes");
      return result;
    }

    result.error = "No meeting link or notes field found";
    await takeDebugScreenshot(page, "owl-meeting-link-no-field");
    return result;
  } catch (err) {
    log.error("syncMeetingLink failed", { error: err });
    result.error = err instanceof Error ? err.message : String(err);
    await takeDebugScreenshot(page, "owl-meeting-link-error");
    return result;
  }
}
