import { tool } from 'ai';
import { z } from 'zod';
import type { BrowserSession } from '../browser/browser-session.js';

export function createScrollTools(session: BrowserSession) {
  return {
    scrollDown: tool({
      description: 'Scroll the page down to see more content.',
      parameters: z.object({
        amount: z
          .number()
          .optional()
          .describe('Pixels to scroll (default: 500). Use larger values to scroll more.'),
      }),
      execute: async ({ amount }) => {
        try {
          await session.page.mouse.wheel(0, amount ?? 500);
          await new Promise((r) => setTimeout(r, 300));
          return { success: true, scrolled: amount ?? 500, direction: 'down' };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    scrollUp: tool({
      description: 'Scroll the page up.',
      parameters: z.object({
        amount: z
          .number()
          .optional()
          .describe('Pixels to scroll (default: 500)'),
      }),
      execute: async ({ amount }) => {
        try {
          await session.page.mouse.wheel(0, -(amount ?? 500));
          await new Promise((r) => setTimeout(r, 300));
          return { success: true, scrolled: amount ?? 500, direction: 'up' };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    scrollToElement: tool({
      description: 'Scroll until a specific element is visible on the page.',
      parameters: z.object({
        selector: z.string().describe('CSS selector for the element to scroll to'),
      }),
      execute: async ({ selector }) => {
        try {
          await session.page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, selector);
          await new Promise((r) => setTimeout(r, 500));
          return { success: true, selector };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),
  };
}
