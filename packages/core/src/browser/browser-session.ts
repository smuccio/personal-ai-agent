import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import {
  createBrowser,
  destroyBrowser,
  type BrowserHandle,
  type CreateBrowserOptions,
} from './kernel-client.js';

export interface BrowserSession {
  /** Kernel session ID (for Computer Controls / vision tools) */
  sessionId: string;
  /** Kernel live view URL (for embedding / observation) */
  liveViewUrl: string;
  /** Playwright Page object (for DOM-based tools) */
  page: Page;
  /** Playwright Browser object */
  browser: Browser;
  /** Playwright BrowserContext */
  context: BrowserContext;
  /** Cleanup: disconnect Playwright and destroy Kernel browser */
  destroy: () => Promise<void>;
}

/**
 * Creates a full browser session: Kernel cloud browser + Playwright CDP connection.
 *
 * CRITICAL: Do NOT call browser.newContext() on a Kernel browser.
 * It breaks stealth/proxy/extension configuration.
 * Always use the default context via browser.contexts()[0].
 */
export async function createBrowserSession(
  options: CreateBrowserOptions = {}
): Promise<BrowserSession> {
  let handle: BrowserHandle | null = null;
  let browser: Browser | null = null;

  try {
    // 1. Create Kernel cloud browser
    handle = await createBrowser(options);

    // 2. Connect Playwright via CDP
    browser = await chromium.connectOverCDP(handle.cdpWsUrl);

    // 3. Get default context (NEVER create a new context)
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error('No default browser context found');
    }

    // 4. Get default page
    const page = context.pages()[0] || (await context.newPage());

    // 5. Build cleanup function
    const destroy = async () => {
      try {
        await browser?.close();
      } catch {
        // Browser may already be disconnected
      }
      try {
        if (handle) await destroyBrowser(handle.sessionId);
      } catch {
        // Session may already be expired
      }
    };

    return {
      sessionId: handle.sessionId,
      liveViewUrl: handle.liveViewUrl,
      page,
      browser,
      context,
      destroy,
    };
  } catch (error) {
    // Cleanup on failure
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    if (handle) {
      try {
        await destroyBrowser(handle.sessionId);
      } catch {}
    }
    throw error;
  }
}
