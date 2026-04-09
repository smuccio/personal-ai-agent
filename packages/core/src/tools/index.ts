import type { BrowserSession } from '../browser/browser-session.js';
import { createNavigationTools } from './navigation.js';
import { createInteractionTools } from './interaction.js';
import { createExtractionTools } from './extraction.js';
import { createVisionTools } from './vision.js';
import { createKeyboardTools } from './keyboard.js';
import { createScrollTools } from './scroll.js';
import { createFormTools } from './form.js';
import { createMetaTools } from './meta.js';

/**
 * Creates all agent tools bound to a browser session.
 * Tools are split into categories:
 * - Playwright-based (fast, CSS selectors): navigation, interaction, extraction, keyboard, scroll, form
 * - Vision-based (screenshots + coordinates): vision
 * - Meta (control flow): done, askUser
 */
export function createAllTools(session: BrowserSession) {
  return {
    ...createNavigationTools(session),
    ...createInteractionTools(session),
    ...createExtractionTools(session),
    ...createVisionTools(session),
    ...createKeyboardTools(session),
    ...createScrollTools(session),
    ...createFormTools(session),
    ...createMetaTools(),
  };
}

export {
  createNavigationTools,
  createInteractionTools,
  createExtractionTools,
  createVisionTools,
  createKeyboardTools,
  createScrollTools,
  createFormTools,
  createMetaTools,
};
