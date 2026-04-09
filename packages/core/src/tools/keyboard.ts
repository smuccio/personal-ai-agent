import { tool } from 'ai';
import { z } from 'zod';
import type { BrowserSession } from '../browser/browser-session.js';

export function createKeyboardTools(session: BrowserSession) {
  return {
    pressKey: tool({
      description:
        'Press a keyboard key or key combination. Common keys: Enter, Tab, Escape, Backspace, Delete, ArrowUp, ArrowDown, ArrowLeft, ArrowRight. For combinations use + (e.g., "Control+a", "Shift+Tab").',
      parameters: z.object({
        key: z
          .string()
          .describe('Key to press (e.g., "Enter", "Tab", "Control+a", "Escape")'),
      }),
      execute: async ({ key }) => {
        try {
          await session.page.keyboard.press(key);
          await new Promise((r) => setTimeout(r, 200));
          return { success: true, key };
        } catch (error) {
          return { success: false, key, error: (error as Error).message };
        }
      },
    }),
  };
}
