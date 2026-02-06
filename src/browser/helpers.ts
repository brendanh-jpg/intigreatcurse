/**
 * Reusable Playwright helpers: waitAndClick, waitAndFill, retry, screenshot, etc.
 */

import type { Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_TIMEOUT = 15000;
const DEBUG_DIR = join(process.cwd(), "debug");

export async function waitAndClick(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  await page.waitForSelector(selector, { state: "visible", timeout });
  await page.click(selector, { timeout });
}

export async function waitAndFill(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.waitForSelector(selector, { state: "visible", timeout: DEFAULT_TIMEOUT });
  await page.fill(selector, value);
}

export async function retryAction<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export async function takeDebugScreenshot(
  page: Page,
  name: string
): Promise<string> {
  await mkdir(DEBUG_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${name}-${timestamp}.png`;
  const path = join(DEBUG_DIR, filename);
  await page.screenshot({ path, fullPage: true });
  return path;
}

export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: DEFAULT_TIMEOUT });
}

export async function selectDropdownOption(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.waitForSelector(selector, { state: "visible", timeout: DEFAULT_TIMEOUT });
  await page.selectOption(selector, value);
}

export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: DEFAULT_TIMEOUT });
  await page.waitForLoadState("domcontentloaded");
}
