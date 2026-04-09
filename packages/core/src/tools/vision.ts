import { tool } from 'ai';
import { z } from 'zod';
import type { BrowserSession } from '../browser/browser-session.js';
import * as kernelClient from '../browser/kernel-client.js';

export function createVisionTools(session: BrowserSession) {
  return {
    screenshot: tool({
      description:
        'Take a screenshot of the current browser view. Returns an image that you can analyze to understand the page layout, find elements, and decide what to do next. Use this when you need to see what the page looks like or cannot determine CSS selectors.',
      parameters: z.object({}),
      execute: async () => {
        try {
          // Try Kernel Computer Controls first (better quality)
          try {
            const base64 = await kernelClient.getScreenshot(session.sessionId);
            return {
              success: true,
              image: base64,
              note: 'Screenshot captured. Analyze the image to identify elements, then use visionClick/visionType to interact by coordinates, or use CSS selectors if you can identify them.',
            };
          } catch {
            // Fallback to Playwright screenshot
            const buffer = await session.page.screenshot({ type: 'png', fullPage: false });
            const base64 = buffer.toString('base64');
            return {
              success: true,
              image: base64,
              note: 'Screenshot captured via Playwright fallback.',
            };
          }
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    visionClick: tool({
      description:
        'Click at specific (x, y) pixel coordinates on the screen. Use this AFTER taking a screenshot when you cannot determine a CSS selector. Analyze the screenshot to find the exact coordinates of the element you want to click.',
      parameters: z.object({
        x: z.number().describe('X coordinate (pixels from left edge)'),
        y: z.number().describe('Y coordinate (pixels from top edge)'),
      }),
      execute: async ({ x, y }) => {
        try {
          await kernelClient.clickAt(session.sessionId, x, y);
          // Small delay to let any navigation/animation happen
          await new Promise((r) => setTimeout(r, 500));
          return { success: true, x, y };
        } catch (error) {
          // Fallback to Playwright mouse
          try {
            await session.page.mouse.click(x, y);
            await new Promise((r) => setTimeout(r, 500));
            return { success: true, x, y, note: 'Used Playwright mouse fallback' };
          } catch (fallbackError) {
            return { success: false, x, y, error: (error as Error).message };
          }
        }
      },
    }),

    visionType: tool({
      description:
        'Type text at the current cursor position. Use this AFTER clicking on an input field (via visionClick or click). The text will be typed character by character.',
      parameters: z.object({
        text: z.string().describe('The text to type'),
        clearFirst: z
          .boolean()
          .optional()
          .describe('Select all and delete before typing (default: false)'),
      }),
      execute: async ({ text, clearFirst }) => {
        try {
          if (clearFirst) {
            await kernelClient.pressKey(session.sessionId, ['Control', 'a']);
            await new Promise((r) => setTimeout(r, 100));
            await kernelClient.pressKey(session.sessionId, ['Backspace']);
            await new Promise((r) => setTimeout(r, 100));
          }
          await kernelClient.typeText(session.sessionId, text);
          return { success: true, text };
        } catch (error) {
          // Fallback to Playwright keyboard
          try {
            if (clearFirst) {
              await session.page.keyboard.press('Control+a');
              await session.page.keyboard.press('Backspace');
            }
            await session.page.keyboard.type(text, { delay: 50 });
            return { success: true, text, note: 'Used Playwright keyboard fallback' };
          } catch {
            return { success: false, error: (error as Error).message };
          }
        }
      },
    }),

    visionScroll: tool({
      description:
        'Scroll the page at specific coordinates. Use this when you need to scroll to see more content.',
      parameters: z.object({
        x: z.number().describe('X coordinate to scroll at'),
        y: z.number().describe('Y coordinate to scroll at'),
        direction: z.enum(['up', 'down']).describe('Scroll direction'),
        amount: z
          .number()
          .optional()
          .describe('Scroll amount in pixels (default: 500)'),
      }),
      execute: async ({ x, y, direction, amount }) => {
        try {
          const delta = (amount ?? 500) * (direction === 'down' ? 1 : -1);
          await kernelClient.scrollAt(session.sessionId, x, y, delta);
          await new Promise((r) => setTimeout(r, 300));
          return { success: true, direction, amount: amount ?? 500 };
        } catch (error) {
          // Fallback to Playwright
          try {
            const delta = (amount ?? 500) * (direction === 'down' ? 1 : -1);
            await session.page.mouse.wheel(0, delta);
            await new Promise((r) => setTimeout(r, 300));
            return { success: true, direction, note: 'Used Playwright fallback' };
          } catch {
            return { success: false, error: (error as Error).message };
          }
        }
      },
    }),
  };
}
