import Hero from '~/components/cms/modules/Hero';
import HeroSearch from '~/components/cms/modules/HeroSearch';
import Search from '~/components/cms/modules/Search';
import BundleBuilder from '~/components/cms/modules/BundleBuilder';
import PageHero from '~/components/cms/modules/PageHero';
import FeatureHero from '~/components/cms/modules/FeatureHero';
import CardGrid from '~/components/cms/modules/CardGrid';
import CtaBar from '~/components/cms/modules/CtaBar';
import FeaturedProduct from '~/components/cms/modules/FeaturedProduct';
import ProductCards from '~/components/cms/modules/ProductCards';
import ProductFeed from '~/components/cms/modules/ProductFeed';
import LinkCards from '~/components/cms/modules/LinkCards';
import TabbedCards from '~/components/cms/modules/TabbedCards';
import TextMedia from '~/components/cms/modules/TextMedia';
import TextHighlights from '~/components/cms/modules/TextHighlights';
import TextChecklist from '~/components/cms/modules/TextChecklist';
import NumberedSteps from '~/components/cms/modules/NumberedSteps';
import ReferenceGuide from '~/components/cms/modules/ReferenceGuide';
import DocumentCards from '~/components/cms/modules/DocumentCards';
import Pricing from '~/components/cms/modules/Pricing';
import Faq from '~/components/cms/modules/Faq';
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
        primaryCTA: {populate: {pageLink: true, collectionLink: true}},
        secondaryCTA: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.hero-search': {
    Component: HeroSearch,
    // Only the media needs naming — every other field is a scalar and comes
    // back with the module. There are no link components here by design.
    options: {
      populate: {
        backgroundImage: true,
      },
    },
  },
  'module.feature-hero': {
    Component: FeatureHero,
    // Same shape as module.hero, plus the callout panel. Every repeatable and
    // relation has to be named or Strapi returns it as bare ids.
    options: {
      populate: {
        backgroundImage: true,
        badge: true,
        trustItems: true,
        infoColumns: true,
        primaryCTA: {populate: {pageLink: true, collectionLink: true}},
        secondaryCTA: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.page-hero': {
    Component: PageHero,
    // Every component field must be named. populate: '*' stops one level down
    // and would return breadcrumbParent without its pageLink relation, so the
    // crumb would resolve to '#'.
    options: {
      populate: {
        backgroundImage: true,
        breadcrumbParent: {populate: {pageLink: true, collectionLink: true}},
        infoColumns: true,
      },
    },
  },
  'module.card-grid': {
    Component: CardGrid,
    // Three levels: items -> image / link -> pageLink. populate: '*' stops at
    // `items` and would return each card with no image and a dead link.
    options: {
      populate: {
        items: {
          populate: {
            image: true,
            link: {populate: {pageLink: true, collectionLink: true}},
          },
        },
      },
    },
  },
  'module.cta-bar': {
    Component: CtaBar,
    options: {
      populate: {
        backgroundImage: true,
        bullets: true,
        cta: {populate: {pageLink: true, collectionLink: true}},
        secondaryCTA: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.featured-product': {
    Component: FeaturedProduct,
    // The product is resolved from Shopify in the route loader; only the
    // button's link relations need naming here.
    options: {
      populate: {
        cta: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.product-cards': {
    Component: ProductCards,
    // `items` carries only handles and copy — the products themselves are
    // resolved from Shopify in the route loader, not populated from Strapi.
    options: {
      populate: {
        items: true,
        viewAllLink: {populate: {pageLink: true, collectionLink: true}},
        // Pick a collection and the cards come from it; its path is the
        // default view-all link.
        collection: {fields: ['name', 'shopifyCollectionHandle', 'path']},
      },
    },
  },
  'module.link-cards': {
    Component: LinkCards,
    // Two levels: items -> link -> pageLink. The icon is an enum, not a
    // relation, so it needs no populate of its own.
    options: {
      populate: {
        items: {
          populate: {
            link: {populate: {pageLink: true, collectionLink: true}},
          },
        },
      },
    },
  },
  'module.search': {
    Component: Search,
    // Only the media needs naming; eyebrow and heading are scalars. The
    // results come from the /search route, not from Strapi.
    options: {
      populate: {
        backgroundImage: true,
      },
    },
  },
  'module.bundle-builder': {
    Component: BundleBuilder,
    /*
     * The builder is a separate collection entry, reached through the
     * `builder` relation, and everything in it is nested components — four
     * levels down to the product rows. Each level has to be named or Strapi
     * returns it empty.
     *
     * The builder must be PUBLISHED for a published page to see it: a
     * relation to a draft-only entry comes back as null.
     */
    options: {
      populate: {
        builder: {
          populate: {
            lineRows: true,
            overMaxLink: {populate: {pageLink: true, collectionLink: true}},
            steps: {
              populate: {
                questions: {
                  populate: {
                    helpLink: {populate: {pageLink: true, collectionLink: true}},
                    choices: {populate: {products: true}},
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  'module.product-feed': {
    Component: ProductFeed,
    /*
     * populate: '*' even though this module has only scalar fields.
     *
     * An empty `populate: {}` serialises to nothing, so the component drops out
     * of `populate[modules][on]` entirely and Strapi omits it from the
     * response — the module silently never renders. Every entry in this
     * registry must produce at least one query parameter.
     */
    options: {populate: '*'},
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
            primaryCTA: {populate: {pageLink: true, collectionLink: true}},
            secondaryCTA: {populate: {pageLink: true, collectionLink: true}},
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
        primaryCTA: {populate: {pageLink: true, collectionLink: true}},
        secondaryCTA: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.text-highlights': {
    Component: TextHighlights,
    // Both repeatables hold nothing but scalars, so `true` is enough — there
    // are no media or link relations to name.
    options: {
      populate: {
        bullets: true,
        highlights: true,
      },
    },
  },
  'module.faq': {
    Component: Faq,
    // The repeatable holds a string and a rich-text string — no media or link
    // relations to name, so `true` is enough.
    options: {
      populate: {
        items: true,
      },
    },
  },
  'module.text-checklist': {
    Component: TextChecklist,
    options: {
      populate: {
        checklist: true,
        primaryCTA: {populate: {pageLink: true, collectionLink: true}},
        secondaryCTA: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.numbered-steps': {
    Component: NumberedSteps,
    // The steps hold nothing but scalars, so `true` is enough. The closing
    // CTA's button is a link, so its relations are named.
    options: {
      populate: {
        steps: true,
        cta: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.reference-guide': {
    Component: ReferenceGuide,
    options: {
      populate: {
        columns: true,
        image: true,
        cta: {populate: {pageLink: true, collectionLink: true}},
      },
    },
  },
  'module.document-cards': {
    Component: DocumentCards,
    options: {
      populate: {
        items: {
          populate: {
            image: true,
            link: {populate: {pageLink: true, collectionLink: true}},
          },
        },
      },
    },
  },
  'module.pricing': {
    Component: Pricing,
    options: {
      populate: {
        plans: {
          populate: {
            prices: true,
            features: true,
            cta: {populate: {pageLink: true, collectionLink: true}},
          },
        },
        comparisonRows: {populate: {planValues: true}},
      },
    },
  },
  'module.category-grid': {
    Component: CategoryGrid,
    options: {
      populate: {
        bannerImage: true,
        bannerCta: {populate: {pageLink: true, collectionLink: true}},
        items: {
          populate: {
            image: true,
            link: {populate: {pageLink: true, collectionLink: true}},
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
        primaryCta: {populate: {pageLink: true, collectionLink: true}},
        secondaryCta: {populate: {pageLink: true, collectionLink: true}},
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
            link: {populate: {pageLink: true, collectionLink: true}},
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
