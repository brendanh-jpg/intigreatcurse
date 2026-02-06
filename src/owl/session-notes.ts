/**
 * Push session notes to Owl Practice via browser automation.
 */

import type { Page } from "playwright";
import type { OwlSessionNoteInput, SyncResult } from "./types.js";
import {
  waitAndClick,
  waitForPageLoad,
  takeDebugScreenshot,
} from "../browser/helpers.js";
import { OWL_SELECTORS } from "./selectors.js";
import { logger } from "../sync/logger.js";

const S = OWL_SELECTORS;

export async function syncSessionNote(
  page: Page,
  note: OwlSessionNoteInput,
  _clientIdMap: Map<string, string>,
  _appointmentIdMap: Map<string, string>
): Promise<SyncResult> {
  const log = logger.child({ action: "syncSessionNote" });
  const result: SyncResult = {
    success: false,
    recordType: "sessionNote",
    playspaceId: "",
  };

  try {
    await page.goto(page.url().replace(/\/[^/]*$/, `/${note.clientId}`)).catch(() => null);
    await waitForPageLoad(page);

    const newNoteBtn = await page.$(S.SESSION_NOTES.newNoteButton);
    if (newNoteBtn) await newNoteBtn.click();
    else {
      await takeDebugScreenshot(page, "owl-session-note-no-button");
      result.error = "Session note entry point not found";
      return result;
    }

    await page.waitForSelector(S.SESSION_NOTES.form.contentEditor, { timeout: 10000 }).catch(async () => {
      await takeDebugScreenshot(page, "owl-note-editor");
      throw new Error("Owl session note editor not found");
    });

    const dateInput = await page.$(S.SESSION_NOTES.form.sessionDate);
    if (dateInput) await dateInput.fill(note.sessionDate);
    const durationInput = await page.$(S.SESSION_NOTES.form.duration);
    if (durationInput) await durationInput.fill(String(note.duration));

    const header = `Session: ${note.sessionDate} | Duration: ${note.duration} min\n\n`;
    const fullContent = header + note.content;

    const editor = await page.$(S.SESSION_NOTES.form.contentEditor);
    if (editor) {
      const tag = await editor.evaluate((el) => el.tagName.toLowerCase());
      if (tag === "textarea") {
        await editor.fill(fullContent);
      } else {
        await editor.evaluate((el, html) => {
          (el as HTMLElement).innerHTML = html.replace(/\n/g, "<br>");
        }, fullContent);
      }
    }

    await waitAndClick(page, S.SESSION_NOTES.form.saveButton);
    await waitForPageLoad(page);

    result.success = true;
    result.playspaceId = note.clientId;
    log.info("Saved session note to Owl");
    return result;
  } catch (err) {
    log.error("syncSessionNote failed", { error: err });
    result.error = err instanceof Error ? err.message : String(err);
    await takeDebugScreenshot(page, "owl-session-note-error");
    return result;
  }
}
