import Hero from '~/components/cms/modules/Hero';
import Wysiwyg from '~/components/cms/modules/Wysiwyg';
import ImageContent from '~/components/cms/modules/ImageContent';

/**
 * Single source of truth for Strapi dynamic-zone modules — ported from
 * nextjs-sample/utils/allModules.js.
 *
 * Each entry is keyed by the Strapi `__component` and carries BOTH:
 *   - `Component`: the React component that renders the module, and
 *   - `options`:   the Strapi `populate` options for this module type.
 *
 * `app/lib/strapi.js` (getPage) reads `.options` to build the deep
 * `populate[modules][on][<__component>]` query; `BlockManager` reads
 * `.Component` to render. To add a module: create a component under
 * `app/components/cms/modules/`, then add one entry here.
 *
 * @type {Record<string, {Component: import('react').ComponentType<any>, options: object}>}
 */
export const MODULE_REGISTRY = {
  'module.hero': {
    Component: Hero,
    // populate: '*' would return the media and link components as bare ids /
    // scalars — backgroundImage.url and the CTA relations would be missing —
    // so each nested piece is named explicitly.
    options: {
      populate: {
        backgroundImage: true,
        trustItems: true,
        primaryCTA: {populate: {pageLink: true}},
        secondaryCTA: {populate: {pageLink: true}},
      },
    },
  },
  'module.wysiwyg': {
    Component: Wysiwyg,
    options: {
      populate: '*',
    },
  },
  'module.image-content': {
    Component: ImageContent,
    options: {
      populate: {
        image: {
          populate: '*',
        },
        content: {
          populate: {
            primaryCTA: {
              populate: '*',
            },
            secondaryCTA: {
              populate: '*',
            },
          },
        },
      },
    },
  },
};
