import { tool } from 'ai';
import { z } from 'zod';
import type { BrowserSession } from '../browser/browser-session.js';

export function createExtractionTools(session: BrowserSession) {
  return {
    extractText: tool({
      description:
        'Extract visible text content from the page or a specific element. Without a selector, returns the main page text (truncated to 5000 chars).',
      parameters: z.object({
        selector: z
          .string()
          .optional()
          .describe('Optional CSS selector to extract text from a specific element. Omit for full page text.'),
      }),
      execute: async ({ selector }) => {
        try {
          let text: string;
          if (selector) {
            text = (await session.page.textContent(selector, { timeout: 5000 })) || '';
          } else {
            text = await session.page.evaluate(() => {
              // Get readable text, skip scripts/styles
              const body = document.body;
              const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                  const parent = node.parentElement;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  const tag = parent.tagName.toLowerCase();
                  if (['script', 'style', 'noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
                  if (parent.offsetParent === null && tag !== 'body') return NodeFilter.FILTER_REJECT;
                  return NodeFilter.FILTER_ACCEPT;
                },
              });
              const texts: string[] = [];
              let node: Node | null;
              while ((node = walker.nextNode())) {
                const trimmed = (node.textContent || '').trim();
                if (trimmed) texts.push(trimmed);
              }
              return texts.join('\n');
            });
          }
          // Truncate to avoid blowing up context
          const truncated = text.length > 5000 ? text.slice(0, 5000) + '\n...[truncated]' : text;
          return { success: true, text: truncated, length: text.length };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    extractLinks: tool({
      description: 'Extract all links from the page or a specific container. Returns href and text for each link.',
      parameters: z.object({
        selector: z
          .string()
          .optional()
          .describe('Optional CSS selector for a container to extract links from. Omit for all page links.'),
        limit: z.number().optional().describe('Max number of links to return (default: 50)'),
      }),
      execute: async ({ selector, limit }) => {
        try {
          const max = limit ?? 50;
          const links = await session.page.evaluate(
            ({ sel, max }) => {
              const container = sel ? document.querySelector(sel) : document;
              if (!container) return [];
              const anchors = container.querySelectorAll('a[href]');
              return Array.from(anchors)
                .slice(0, max)
                .map((a) => ({
                  text: (a as HTMLAnchorElement).textContent?.trim() || '',
                  href: (a as HTMLAnchorElement).href,
                }));
            },
            { sel: selector ?? null, max }
          );
          return { success: true, links, count: links.length };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    extractTable: tool({
      description: 'Extract data from an HTML table as structured rows.',
      parameters: z.object({
        selector: z
          .string()
          .optional()
          .describe('CSS selector for the table (default: first table on page)'),
      }),
      execute: async ({ selector }) => {
        try {
          const data = await session.page.evaluate((sel) => {
            const table = document.querySelector(sel || 'table') as HTMLTableElement;
            if (!table) return null;
            const rows: string[][] = [];
            for (const row of table.rows) {
              const cells: string[] = [];
              for (const cell of row.cells) {
                cells.push(cell.textContent?.trim() || '');
              }
              rows.push(cells);
            }
            return { headers: rows[0] || [], rows: rows.slice(1) };
          }, selector ?? null);

          if (!data) return { success: false, error: 'No table found' };
          return { success: true, ...data };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      },
    }),

    getPageTitle: tool({
      description: 'Get the current page title.',
      parameters: z.object({}),
      execute: async () => {
        return { title: await session.page.title() };
      },
    }),

    getPageInfo: tool({
      description: 'Get a summary of the current page: title, URL, and visible form fields / buttons / inputs.',
      parameters: z.object({}),
      execute: async () => {
        const info = await session.page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .slice(0, 20)
            .map((el) => ({
              tag: el.tagName.toLowerCase(),
              type: el.getAttribute('type') || '',
              name: el.getAttribute('name') || '',
              placeholder: el.getAttribute('placeholder') || '',
              id: el.id || '',
            }));
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .slice(0, 20)
            .map((el) => ({
              text: el.textContent?.trim() || '',
              type: el.getAttribute('type') || '',
              id: el.id || '',
            }));
          return { inputs, buttons };
        });
        return {
          title: await session.page.title(),
          url: session.page.url(),
          ...info,
        };
      },
    }),
  };
}
