/**
 * Create/update clients in Owl Practice via browser automation.
 */

import type { Page } from "playwright";
import type { OwlClientInput, SyncResult } from "./types.js";
import {
  waitAndClick,
  waitForPageLoad,
  takeDebugScreenshot,
} from "../browser/helpers.js";
import { OWL_SELECTORS } from "./selectors.js";
import { logger } from "../sync/logger.js";

const S = OWL_SELECTORS;

async function searchClient(page: Page, query: string): Promise<string | null> {
  await page.waitForSelector(S.CLIENTS.searchInput, { timeout: 10000 }).catch(() => null);
  if (!(await page.$(S.CLIENTS.searchInput))) return null;
  await page.fill(S.CLIENTS.searchInput, query);
  await new Promise((r) => setTimeout(r, 800));
  const row = await page.$(S.CLIENTS.clientRow);
  if (!row) return null;
  const link = await row.$("a[href*='client'], a[href*='patients']");
  if (!link) return null;
  const href = await link.getAttribute("href");
  const idMatch = href?.match(/[\w-]+$/);
  return idMatch ? idMatch[0] : null;
}

export async function syncClient(
  page: Page,
  client: OwlClientInput,
  playspaceId?: string
): Promise<SyncResult> {
  const log = logger.child({ action: "syncClient", playspaceId });
  const result: SyncResult = {
    success: false,
    recordType: "client",
    playspaceId: playspaceId ?? "",
  };

  try {
    await page.waitForSelector(S.NAVIGATION.clientsNav, { timeout: 5000 });
    await waitAndClick(page, S.NAVIGATION.clientsNav);
    await waitForPageLoad(page);

    const searchQuery = `${client.firstName} ${client.lastName}`.trim();
    const existingId = await searchClient(page, searchQuery);

    if (existingId) {
      log.info("Updating existing Owl client", { owlId: existingId });
      const row = await page.$(S.CLIENTS.clientRow);
      if (row) await row.click();
      await waitForPageLoad(page);
      await page.waitForSelector(S.CLIENTS.form.firstName, { timeout: 5000 }).catch(() => null);
      if (await page.$(S.CLIENTS.form.firstName)) {
        await page.fill(S.CLIENTS.form.firstName, client.firstName);
        await page.fill(S.CLIENTS.form.lastName, client.lastName);
        if (client.email) await page.fill(S.CLIENTS.form.email, client.email);
        if (client.phone) await page.fill(S.CLIENTS.form.phone, client.phone);
        if (client.dateOfBirth) await page.fill(S.CLIENTS.form.dob, client.dateOfBirth);
        await waitAndClick(page, S.CLIENTS.form.saveButton);
        await waitForPageLoad(page);
      }
      result.success = true;
      result.owlId = existingId;
      return result;
    }

    await waitAndClick(page, S.CLIENTS.newClientButton);
    await page.waitForSelector(S.CLIENTS.form.firstName, { timeout: 10000 }).catch(async () => {
      await takeDebugScreenshot(page, "owl-new-client-form");
      throw new Error("Owl new client form not found");
    });

    await page.fill(S.CLIENTS.form.firstName, client.firstName);
    await page.fill(S.CLIENTS.form.lastName, client.lastName);
    if (client.email) await page.fill(S.CLIENTS.form.email, client.email);
    if (client.phone) await page.fill(S.CLIENTS.form.phone, client.phone);
    if (client.dateOfBirth) await page.fill(S.CLIENTS.form.dob, client.dateOfBirth);
    await waitAndClick(page, S.CLIENTS.form.saveButton);
    await waitForPageLoad(page);

    const url = page.url();
    const idMatch = url.match(/[\w-]+$/);
    const newId = idMatch ? idMatch[0] : undefined;
    await takeDebugScreenshot(page, "owl-client-created");

    result.success = true;
    result.owlId = newId ?? "unknown";
    log.info("Created new Owl client", { owlId: result.owlId });
    return result;
  } catch (err) {
    log.error("syncClient failed", { error: err });
    result.error = err instanceof Error ? err.message : String(err);
    await takeDebugScreenshot(page, "owl-client-error");
    return result;
  }
}
