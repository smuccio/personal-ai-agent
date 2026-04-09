import { tool } from 'ai';
import { z } from 'zod';
import type { BrowserSession } from '../browser/browser-session.js';

export function createFormTools(session: BrowserSession) {
  return {
    fillForm: tool({
      description:
        'Fill multiple form fields at once. Each field is identified by a CSS selector and a value. More efficient than calling type() multiple times.',
      parameters: z.object({
        fields: z
          .array(
            z.object({
              selector: z.string().describe('CSS selector for the input field'),
              value: z.string().describe('Value to fill in'),
            })
          )
          .describe('Array of fields to fill'),
      }),
      execute: async ({ fields }) => {
        const results: { selector: string; success: boolean; error?: string }[] = [];
        for (const field of fields) {
          try {
            await session.page.fill(field.selector, field.value, { timeout: 5000 });
            results.push({ selector: field.selector, success: true });
          } catch (error) {
            results.push({
              selector: field.selector,
              success: false,
              error: (error as Error).message,
            });
          }
        }
        const allSucceeded = results.every((r) => r.success);
        return { success: allSucceeded, results };
      },
    }),

    submitForm: tool({
      description:
        'Submit a form by clicking a submit button or pressing Enter. Tries the submit button first, falls back to pressing Enter.',
      parameters: z.object({
        selector: z
          .string()
          .optional()
          .describe('CSS selector for the submit button. If omitted, tries common submit selectors.'),
      }),
      execute: async ({ selector }) => {
        try {
          if (selector) {
            await session.page.click(selector, { timeout: 5000 });
          } else {
            // Try common submit patterns
            const submitted = await session.page.evaluate(() => {
              const selectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Sign in")',
                'button:has-text("Log in")',
                'button:has-text("Search")',
              ];
              for (const sel of selectors) {
                const el = document.querySelector(sel) as HTMLElement;
                if (el && el.offsetParent !== null) {
                  el.click();
                  return true;
                }
              }
              return false;
            });
            if (!submitted) {
              // Fallback: press Enter
              await session.page.keyboard.press('Enter');
            }
          }
          // Wait for potential navigation
          await new Promise((r) => setTimeout(r, 1000));
          return { success: true, url: session.page.url() };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),
  };
}
