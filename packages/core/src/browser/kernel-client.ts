import Kernel from '@onkernel/sdk';

export interface BrowserHandle {
  sessionId: string;
  cdpWsUrl: string;
  liveViewUrl: string;
}

export interface CreateBrowserOptions {
  /** Enable stealth mode (residential proxy, fingerprint removal) */
  stealth?: boolean;
  /** Session timeout in seconds (default: 300, max: 259200 = 72hrs) */
  timeout?: number;
  /** Kernel profile ID for persistent cookies/auth */
  profileId?: string;
  /** Viewport preset or custom dimensions */
  viewport?: { width: number; height: number };
}

const kernel = new Kernel({
  apiKey: process.env.KERNEL_API_KEY,
});

/**
 * Create a new cloud browser session via Kernel.
 */
export async function createBrowser(
  options: CreateBrowserOptions = {}
): Promise<BrowserHandle> {
  const browser = await kernel.browsers.create({
    stealth: options.stealth ?? true,
    timeout_seconds: options.timeout ?? 300,
    ...(options.profileId && { profile: { id: options.profileId } }),
    ...(options.viewport && { viewport: options.viewport }),
  });

  return {
    sessionId: browser.session_id,
    cdpWsUrl: browser.cdp_ws_url,
    liveViewUrl: browser.browser_live_view_url,
  };
}

/**
 * Destroy a browser session.
 */
export async function destroyBrowser(sessionId: string): Promise<void> {
  await kernel.browsers.delete(sessionId);
}

/**
 * Capture a screenshot of the current browser state.
 * Returns base64 PNG string.
 */
export async function getScreenshot(sessionId: string): Promise<string> {
  const result = await kernel.browsers.computer.captureScreenshot(sessionId);
  return result.screenshot_base64;
}

/**
 * Click at specific coordinates (vision-based interaction).
 */
export async function clickAt(
  sessionId: string,
  x: number,
  y: number
): Promise<void> {
  await kernel.browsers.computer.clickMouse(sessionId, { x, y });
}

/**
 * Type text at the current cursor position.
 */
export async function typeText(
  sessionId: string,
  text: string
): Promise<void> {
  await kernel.browsers.computer.typeText(sessionId, { text });
}

/**
 * Press keyboard keys.
 */
export async function pressKey(
  sessionId: string,
  keys: string[]
): Promise<void> {
  await kernel.browsers.computer.pressKey(sessionId, { keys });
}

/**
 * Scroll at specific coordinates.
 */
export async function scrollAt(
  sessionId: string,
  x: number,
  y: number,
  deltaY: number
): Promise<void> {
  await kernel.browsers.computer.scroll(sessionId, {
    x,
    y,
    delta_y: deltaY,
  });
}

/**
 * Move mouse to specific coordinates.
 */
export async function moveMouse(
  sessionId: string,
  x: number,
  y: number
): Promise<void> {
  await kernel.browsers.computer.moveMouse(sessionId, {
    x,
    y,
    smooth: true,
  });
}
