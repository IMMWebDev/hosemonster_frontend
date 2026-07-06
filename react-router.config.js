import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

/**
 * React Router 7.9.x Configuration for Hydrogen
 *
 * This configuration uses the official Hydrogen preset to provide optimal
 * React Router settings for Shopify Oxygen deployment. The preset enables
 * validated performance optimizations while ensuring compatibility.
 */
export default {
  presets: [hydrogenPreset()],
  // Opt into React Router v8 behavior early (both become the default in v8).
  // Merged with — not overriding — the Hydrogen preset's own future flags.
  future: {
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
};

/** @typedef {import('@react-router/dev/config').Config} Config */
