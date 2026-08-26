import Hero from '~/components/cms/modules/Hero';
import TabbedCards from '~/components/cms/modules/TabbedCards';
import TextMedia from '~/components/cms/modules/TextMedia';
import CategoryGrid from '~/components/cms/modules/CategoryGrid';
import CtaBanner from '~/components/cms/modules/CtaBanner';
import FeatureCards from '~/components/cms/modules/FeatureCards';
import Testimonials from '~/components/cms/modules/Testimonials';
import Ticker from '~/components/cms/modules/Ticker';
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
  'module.tabbed-cards': {
    Component: TabbedCards,
    // Three levels: items -> image / CTAs -> pageLink. populate: '*' stops at
    // `items` and would return each one with no image and no CTAs.
    options: {
      populate: {
        items: {
          populate: {
            image: true,
            primaryCTA: {populate: {pageLink: true}},
            secondaryCTA: {populate: {pageLink: true}},
          },
        },
      },
    },
  },
  'module.text-media': {
    Component: TextMedia,
    options: {
      populate: {
        image: true,
        bullets: true,
        primaryCTA: {populate: {pageLink: true}},
        secondaryCTA: {populate: {pageLink: true}},
      },
    },
  },
  'module.category-grid': {
    Component: CategoryGrid,
    options: {
      populate: {
        bannerImage: true,
        bannerCta: {populate: {pageLink: true}},
        items: {
          populate: {
            image: true,
            link: {populate: {pageLink: true}},
          },
        },
      },
    },
  },
  'module.cta-banner': {
    Component: CtaBanner,
    options: {
      populate: {
        backgroundImage: true,
        primaryCta: {populate: {pageLink: true}},
        secondaryCta: {populate: {pageLink: true}},
      },
    },
  },
  'module.feature-cards': {
    Component: FeatureCards,
    options: {
      populate: {
        items: {
          populate: {
            image: true,
            link: {populate: {pageLink: true}},
          },
        },
      },
    },
  },
  'module.testimonials': {
    Component: Testimonials,
    options: {
      populate: {items: {populate: {authorImage: true}}},
    },
  },
  'module.ticker': {
    Component: Ticker,
    options: {
      populate: {items: true},
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
