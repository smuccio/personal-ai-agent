import { tool } from 'ai';
import { z } from 'zod';
import type { BrowserSession } from '../browser/browser-session.js';

export function createNavigationTools(session: BrowserSession) {
  return {
    navigate: tool({
      description:
        'Navigate to a URL. Use this to go to any website. Returns the page title and final URL after any redirects.',
      parameters: z.object({
        url: z.string().describe('The URL to navigate to (e.g., "https://google.com")'),
      }),
      execute: async ({ url }) => {
        try {
          await session.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          const title = await session.page.title();
          const finalUrl = session.page.url();
          return { success: true, title, url: finalUrl };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    goBack: tool({
      description: 'Go back to the previous page in browser history.',
      parameters: z.object({}),
      execute: async () => {
        try {
          await session.page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 });
          return { success: true, url: session.page.url(), title: await session.page.title() };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    goForward: tool({
      description: 'Go forward to the next page in browser history.',
      parameters: z.object({}),
      execute: async () => {
        try {
          await session.page.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 });
          return { success: true, url: session.page.url(), title: await session.page.title() };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    getCurrentUrl: tool({
      description: 'Get the current page URL.',
      parameters: z.object({}),
      execute: async () => {
        return { url: session.page.url() };
      },
    }),

    waitForPageLoad: tool({
      description:
        'Wait for the page to finish loading. Use after actions that trigger navigation or dynamic content.',
      parameters: z.object({
        timeout: z
          .number()
          .optional()
          .describe('Max time to wait in milliseconds (default: 10000)'),
      }),
      execute: async ({ timeout }) => {
        try {
          await session.page.waitForLoadState('networkidle', {
            timeout: timeout ?? 10000,
          });
          return { success: true, url: session.page.url() };
        } catch {
          return { success: true, url: session.page.url(), note: 'Timeout reached but page may still be usable' };
        }
      },
    }),
  };
}
