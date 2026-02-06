/**
 * Owl Practice login automation.
 */

import type { Page } from "playwright";
import { loadEnv } from "../config/env.js";
import {
  waitAndClick,
  waitAndFill,
  waitForPageLoad,
  takeDebugScreenshot,
} from "../browser/helpers.js";
import { OWL_SELECTORS } from "./selectors.js";
import { logger } from "../sync/logger.js";

const S = OWL_SELECTORS;
const MFA_WAIT_MS = 120_000;

export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector(S.LOGIN.dashboardIndicator, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function loginToOwl(page: Page): Promise<void> {
  const env = loadEnv();
  await page.goto(env.OWL_PRACTICE_URL, { waitUntil: "domcontentloaded" });
  await waitForPageLoad(page);

  if (await isLoggedIn(page)) {
    logger.info("Owl Practice already logged in");
    return;
  }

  await page.waitForSelector(S.LOGIN.emailInput, { timeout: 10000 }).catch(async () => {
    await takeDebugScreenshot(page, "owl-login-form");
    throw new Error("Owl Practice: login form not found");
  });

  await waitAndFill(page, S.LOGIN.emailInput, env.OWL_USERNAME);
  await waitAndFill(page, S.LOGIN.passwordInput, env.OWL_PASSWORD);
  await waitAndClick(page, S.LOGIN.submitButton);

  const mfaSelector = S.LOGIN.mfaInput;
  const mfaVisible = await page.$(mfaSelector).then((el) => !!el);
  if (mfaVisible) {
    logger.warn("Owl Practice MFA required — enter code manually in Browserbase live view");
    console.log("MFA required — enter code manually in Browserbase live view");
    await page.waitForSelector(S.LOGIN.dashboardIndicator, { timeout: MFA_WAIT_MS }).catch(async () => {
      await takeDebugScreenshot(page, "owl-mfa-timeout");
      throw new Error("Owl Practice: dashboard did not appear after MFA (timeout)");
    });
  } else {
    await page.waitForSelector(S.LOGIN.dashboardIndicator, { timeout: 15000 }).catch(async () => {
      await takeDebugScreenshot(page, "owl-after-login");
      throw new Error("Owl Practice: dashboard not found after login");
    });
  }

  logger.info("Owl Practice login succeeded");
}

export async function handleSessionExpiry(page: Page): Promise<void> {
  if (!(await isLoggedIn(page))) {
    await loginToOwl(page);
  }
}
