/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  /**
   * Environment variables. Extends Hydrogen's built-in `Env` (interfaces merge).
   * Strapi values are set in `.env` locally and in Oxygen env vars per
   * environment; `STRAPI_API_TOKEN` is a server-side secret.
   */
  interface Env {
    STRAPI_API_URL: string;
    STRAPI_API_TOKEN: string;
    /** Shared secret required by the /preview route. Preview is disabled until set. */
    PREVIEW_SECRET: string;
  }

  /**
   * Custom values injected onto the Hydrogen router context via
   * `additionalContext` in app/lib/context.js. Makes `context.strapi` typed
   * in loaders/actions.
   */
  interface HydrogenAdditionalContext {
    strapi: ReturnType<typeof import('~/lib/strapi').createStrapiClient>;
  }
}
