/**
 * Browserbase session management.
 * Creates sessions via REST API, connects Playwright via CDP, handles cleanup.
 */

import { chromium } from "playwright";
import type { Browser } from "playwright";
import type { Page } from "playwright";
import { loadEnv } from "../config/env.js";
import { takeDebugScreenshot } from "./helpers.js";

const SESSION_TIMEOUT_SECONDS = 300; // 5 minutes
const BROWSERBASE_API = "https://api.browserbase.com";
const BROWSERBASE_CONNECT = "wss://connect.browserbase.com";

export interface SessionResult {
  browser: Browser;
  page: Page;
  sessionId: string;
}

async function createBrowserbaseSession(apiKey: string, projectId: string): Promise<{ id: string }> {
  const res = await fetch(`${BROWSERBASE_API}/v1/sessions`, {
    method: "POST",
    headers: {
      "x-bb-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId, timeout: SESSION_TIMEOUT_SECONDS }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Browserbase createSession failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Browserbase createSession did not return id");
  return { id: data.id };
}

function getConnectUrl(apiKey: string, sessionId: string): string {
  return `${BROWSERBASE_CONNECT}?apiKey=${apiKey}&sessionId=${sessionId}`;
}

async function completeBrowserbaseSession(apiKey: string, projectId: string, sessionId: string): Promise<void> {
  await fetch(`${BROWSERBASE_API}/v1/sessions/${sessionId}`, {
    method: "POST",
    headers: {
      "x-bb-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId, status: "REQUEST_RELEASE" }),
  });
}

export async function createSession(): Promise<SessionResult> {
  const env = loadEnv();
  const { id: sessionId } = await createBrowserbaseSession(
    env.BROWSERBASE_API_KEY,
    env.BROWSERBASE_PROJECT_ID
  );

  const connectUrl = getConnectUrl(env.BROWSERBASE_API_KEY, sessionId);

  const browser = await chromium.connectOverCDP(connectUrl, {
    timeout: 60000,
  });

  const defaultContext = browser.contexts()[0];
  let page = defaultContext.pages()[0];
  if (!page) {
    page = await defaultContext.newPage();
  }

  return { browser, page, sessionId };
}

export async function closeSession(sessionId: string): Promise<void> {
  const env = loadEnv();
  try {
    await completeBrowserbaseSession(
      env.BROWSERBASE_API_KEY,
      env.BROWSERBASE_PROJECT_ID,
      sessionId
    );
  } catch {
    // Best-effort cleanup; session may already be closed
  }
}

export async function withSession<T>(
  callback: (result: SessionResult) => Promise<T>
): Promise<T> {
  const session = await createSession();
  try {
    return await callback(session);
  } catch (err) {
    try {
      await takeDebugScreenshot(session.page, "session-error");
    } catch {
      // ignore screenshot errors
    }
    throw err;
  } finally {
    await closeSession(session.sessionId);
  }
}
