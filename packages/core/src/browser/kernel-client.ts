import Kernel from '@onkernel/sdk';

export interface BrowserHandle {
  sessionId: string;
  cdpWsUrl: string;
  liveViewUrl: string;
}

export interface CreateBrowserOptions {
  stealth?: boolean;
  timeout?: number;
  profileId?: string;
  viewport?: { width: number; height: number };
}

let _kernel: Kernel | null = null;

function getKernel(): Kernel {
  if (!_kernel) {
    _kernel = new Kernel({
      apiKey: process.env.KERNEL_API_KEY,
    });
  }
  return _kernel;
}

export async function createBrowser(
  options: CreateBrowserOptions = {}
): Promise<BrowserHandle> {
  const browser = await getKernel().browsers.create({
    stealth: options.stealth ?? true,
    timeout_seconds: options.timeout ?? 300,
    ...(options.profileId && { profile: { id: options.profileId } }),
    ...(options.viewport && {
      viewport: {
        width: options.viewport.width,
        height: options.viewport.height,
      },
    }),
  });

  return {
    sessionId: browser.session_id,
    cdpWsUrl: browser.cdp_ws_url,
    liveViewUrl: browser.browser_live_view_url || '',
  };
}

export async function destroyBrowser(sessionId: string): Promise<void> {
  await getKernel().browsers.deleteByID(sessionId);
}

/**
 * Capture a screenshot. Returns base64 PNG string.
 */
export async function getScreenshot(sessionId: string): Promise<string> {
  const response = await getKernel().browsers.computer.captureScreenshot(sessionId);
  // Response is a raw Response object - read as arrayBuffer then convert to base64
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function clickAt(
  sessionId: string,
  x: number,
  y: number
): Promise<void> {
  await getKernel().browsers.computer.clickMouse(sessionId, { x, y });
}

export async function typeText(
  sessionId: string,
  text: string
): Promise<void> {
  await getKernel().browsers.computer.typeText(sessionId, { text });
}

export async function pressKey(
  sessionId: string,
  keys: string[]
): Promise<void> {
  await getKernel().browsers.computer.pressKey(sessionId, { keys });
}

export async function scrollAt(
  sessionId: string,
  x: number,
  y: number,
  deltaY: number
): Promise<void> {
  await getKernel().browsers.computer.scroll(sessionId, {
    x,
    y,
    delta_y: deltaY,
  });
}

export async function moveMouse(
  sessionId: string,
  x: number,
  y: number
): Promise<void> {
  await getKernel().browsers.computer.moveMouse(sessionId, { x, y });
}
