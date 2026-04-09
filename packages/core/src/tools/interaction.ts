import { tool } from 'ai';
import { z } from 'zod';
import type { BrowserSession } from '../browser/browser-session.js';

export function createInteractionTools(session: BrowserSession) {
  return {
    click: tool({
      description:
        'Click an element on the page using a CSS selector. Use this when you know the selector for the element you want to click.',
      parameters: z.object({
        selector: z
          .string()
          .describe('CSS selector for the element to click (e.g., "button.submit", "#login-btn", "a[href=\'/about\']")'),
      }),
      execute: async ({ selector }) => {
        try {
          await session.page.click(selector, { timeout: 5000 });
          return { success: true, selector };
        } catch (error) {
          return { success: false, selector, error: (error as Error).message };
        }
      },
    }),

    type: tool({
      description:
        'Type text into an input field identified by a CSS selector. Clears the field first, then types the text.',
      parameters: z.object({
        selector: z
          .string()
          .describe('CSS selector for the input field (e.g., "input[name=\'email\']", "#search-box")'),
        text: z.string().describe('The text to type into the field'),
      }),
      execute: async ({ selector, text }) => {
        try {
          await session.page.fill(selector, text, { timeout: 5000 });
          return { success: true, selector, text };
        } catch (error) {
          // Fallback: try click then type character by character
          try {
            await session.page.click(selector, { timeout: 5000 });
            await session.page.keyboard.type(text, { delay: 50 });
            return { success: true, selector, text, note: 'Used keyboard fallback' };
          } catch (fallbackError) {
            return { success: false, selector, error: (error as Error).message };
          }
        }
      },
    }),

    selectOption: tool({
      description: 'Select an option from a dropdown/select element.',
      parameters: z.object({
        selector: z.string().describe('CSS selector for the <select> element'),
        value: z.string().describe('The value or visible text of the option to select'),
      }),
      execute: async ({ selector, value }) => {
        try {
          // Try by value first, then by label
          try {
            await session.page.selectOption(selector, { value }, { timeout: 5000 });
          } catch {
            await session.page.selectOption(selector, { label: value }, { timeout: 5000 });
          }
          return { success: true, selector, value };
        } catch (error) {
          return { success: false, selector, error: (error as Error).message };
        }
      },
    }),

    hover: tool({
      description: 'Hover over an element. Useful for triggering dropdown menus or tooltips.',
      parameters: z.object({
        selector: z.string().describe('CSS selector for the element to hover over'),
      }),
      execute: async ({ selector }) => {
        try {
          await session.page.hover(selector, { timeout: 5000 });
          return { success: true, selector };
        } catch (error) {
          return { success: false, selector, error: (error as Error).message };
        }
      },
    }),

    waitForElement: tool({
      description:
        'Wait for an element to appear on the page. Use when content loads dynamically.',
      parameters: z.object({
        selector: z.string().describe('CSS selector to wait for'),
        timeout: z.number().optional().describe('Max wait time in ms (default: 10000)'),
      }),
      execute: async ({ selector, timeout }) => {
        try {
          await session.page.waitForSelector(selector, {
            timeout: timeout ?? 10000,
            state: 'visible',
          });
          return { success: true, selector, found: true };
        } catch {
          return { success: false, selector, found: false };
        }
      },
    }),
  };
}
