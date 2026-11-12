import Hero from '~/components/cms/modules/Hero';
import HeroSearch from '~/components/cms/modules/HeroSearch';
import Search from '~/components/cms/modules/Search';
import BundleBuilder from '~/components/cms/modules/BundleBuilder';
import PageHero from '~/components/cms/modules/PageHero';
import FeatureHero from '~/components/cms/modules/FeatureHero';
import CalculatorPreview from '~/components/cms/modules/CalculatorPreview';
import CardGrid from '~/components/cms/modules/CardGrid';
import CardPicker from '~/components/cms/modules/CardPicker';
import CtaBar from '~/components/cms/modules/CtaBar';
import FeaturedBlog from '~/components/cms/modules/FeaturedBlog';
import FeaturedProduct from '~/components/cms/modules/FeaturedProduct';
import FeaturedVideos from '~/components/cms/modules/FeaturedVideos';
import PostGrid from '~/components/cms/modules/PostGrid';
import ProductCards from '~/components/cms/modules/ProductCards';
import ProductFeed from '~/components/cms/modules/ProductFeed';
import LinkCards from '~/components/cms/modules/LinkCards';
import TabbedCards from '~/components/cms/modules/TabbedCards';
import TextMedia from '~/components/cms/modules/TextMedia';
import TextForm from '~/components/cms/modules/TextForm';
import TextTable from '~/components/cms/modules/TextTable';
import TextHighlights from '~/components/cms/modules/TextHighlights';
import TextBadge from '~/components/cms/modules/TextBadge';
import TextChecklist from '~/components/cms/modules/TextChecklist';
import NumberedBenefits from '~/components/cms/modules/NumberedBenefits';
import NumberedLinkCards from '~/components/cms/modules/NumberedLinkCards';
import NumberedSteps from '~/components/cms/modules/NumberedSteps';
import ReferenceGuide from '~/components/cms/modules/ReferenceGuide';
import DocumentCards from '~/components/cms/modules/DocumentCards';
import Pricing from '~/components/cms/modules/Pricing';
import Faq from '~/components/cms/modules/Faq';
import CategoryGrid from '~/components/cms/modules/CategoryGrid';
import CourseCards from '~/components/cms/modules/CourseCards';
import CtaBanner from '~/components/cms/modules/CtaBanner';
import SpecSheet from '~/components/cms/modules/SpecSheet';
import StatBanner from '~/components/cms/modules/StatBanner';
import StatsComparison from '~/components/cms/modules/StatsComparison';
import StepGuide from '~/components/cms/modules/StepGuide';
import FeatureCards from '~/components/cms/modules/FeatureCards';
import TestimonialStrip from '~/components/cms/modules/TestimonialStrip';
import Testimonials from '~/components/cms/modules/Testimonials';
import Ticker from '~/components/cms/modules/Ticker';
import VideoLibrary from '~/components/cms/modules/VideoLibrary';
import Wysiwyg from '~/components/cms/modules/Wysiwyg';
import BlogCtaCard from '~/components/cms/blog-modules/BlogCtaCard';
import BlogImage from '~/components/cms/blog-modules/BlogImage';
import BlogImageRow from '~/components/cms/blog-modules/BlogImageRow';
import BlogNote from '~/components/cms/blog-modules/BlogNote';
import BlogVideo from '~/components/cms/blog-modules/BlogVideo';
import ImageContent from '~/components/cms/modules/ImageContent';
import {LINK_POPULATE} from '~/lib/cms-links';
import {BLOG_CARD_QUERY} from '~/lib/module-blogs';
import {VIDEO_CARD_QUERY} from '~/lib/videos';

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
        primaryCTA: {populate: LINK_POPULATE},
        secondaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.featured-videos': {
    Component: FeaturedVideos,
    // The picked videos with what a card reads (lib/videos); the link needs
    // its relations.
    options: {
      populate: {
        videos: VIDEO_CARD_QUERY,
        link: {populate: LINK_POPULATE},
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
        breadcrumbs: {populate: {breadcrumbLinks: {populate: LINK_POPULATE}}},
        trustItems: true,
        infoColumns: true,
        primaryCTA: {populate: LINK_POPULATE},
        secondaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.page-hero': {
    Component: PageHero,
    // Every component field must be named. populate: '*' stops one level down
    // and would return the breadcrumbs without their pageLink relations, so
    // every crumb would resolve to '#'.
    options: {
      populate: {
        backgroundImage: true,
        badge: true,
        breadcrumbs: {populate: {breadcrumbLinks: {populate: LINK_POPULATE}}},
        primaryCTA: {populate: LINK_POPULATE},
        secondaryCTA: {populate: LINK_POPULATE},
        infoColumns: true,
      },
    },
  },
  'module.calculator-preview': {
    Component: CalculatorPreview,
    // The sample inputs are a repeatable component and the button a link with
    // its own page relation — both need naming or Strapi returns them empty.
    options: {
      populate: {
        inputs: true,
        primaryCTA: {populate: LINK_POPULATE},
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
            link: {populate: LINK_POPULATE},
          },
        },
        note: true,
        primaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.cta-bar': {
    Component: CtaBar,
    options: {
      populate: {
        backgroundImage: true,
        bullets: true,
        primaryCTA: {populate: LINK_POPULATE},
        secondaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.featured-blog': {
    Component: FeaturedBlog,
    // The picked post, with what its card shows (lib/module-blogs).
    options: {
      populate: {
        blog: BLOG_CARD_QUERY,
      },
    },
  },
  'module.featured-product': {
    Component: FeaturedProduct,
    // The product is resolved from Shopify in the route loader; only the
    // button's link relations need naming here.
    options: {
      populate: {
        primaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.post-grid': {
    Component: PostGrid,
    // Scalars only: the posts themselves come from the route loader
    // (lib/module-blogs.js → the blogPosts prop).
    options: {
      populate: '*',
    },
  },
  'module.product-cards': {
    Component: ProductCards,
    // `items` carries only handles and copy — the products themselves are
    // resolved from Shopify in the route loader, not populated from Strapi.
    options: {
      populate: {
        items: true,
        viewAllLink: {populate: LINK_POPULATE},
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
            link: {populate: LINK_POPULATE},
          },
        },
        note: true,
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
            overMaxLink: {populate: LINK_POPULATE},
            steps: {
              populate: {
                questions: {
                  populate: {
                    helpLink: {populate: LINK_POPULATE},
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
  'module.card-picker': {
    Component: CardPicker,
    // Three levels: items -> image / link -> its relations. populate: '*'
    // stops at `items` and would return each card with no photo or link.
    options: {
      populate: {
        items: {
          populate: {
            image: true,
            link: {populate: LINK_POPULATE},
          },
        },
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
            primaryCTA: {populate: LINK_POPULATE},
            secondaryCTA: {populate: LINK_POPULATE},
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
        primaryCTA: {populate: LINK_POPULATE},
        secondaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.text-table': {
    Component: TextTable,
    // Rows nest their values one level down (comparison-row -> planValues), and
    // the header link needs its relations, so neither is reached by '*'.
    options: {
      populate: {
        headerLink: {populate: LINK_POPULATE},
        columns: true,
        rows: {populate: {planValues: true}},
        note: true,
      },
    },
  },
  'module.text-form': {
    Component: TextForm,
    /*
     * Scalars only. populate: '*' because an empty `populate: {}` serialises
     * to nothing and the module would drop out of the query entirely — see
     * module.product-feed.
     */
    options: {populate: '*'},
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
  'module.text-badge': {
    Component: TextBadge,
    // The badge is the one media field; the link needs its relations.
    options: {
      populate: {
        badge: true,
        link: {populate: LINK_POPULATE},
      },
    },
  },
  'module.text-checklist': {
    Component: TextChecklist,
    options: {
      populate: {
        checklist: true,
        primaryCTA: {populate: LINK_POPULATE},
        secondaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.numbered-benefits': {
    Component: NumberedBenefits,
    // Both repeatables hold only scalars, so `true` is enough; the photo is
    // the one relation to name.
    options: {
      populate: {
        backgroundImage: true,
        items: true,
        cardChecklist: true,
      },
    },
  },
  'module.numbered-link-cards': {
    Component: NumberedLinkCards,
    // cards -> links: a list link has the same relations as utilities.link,
    // so LINK_POPULATE reaches them. Product links carry only productRef,
    // resolved in the route loader (lib/module-products).
    options: {
      populate: {
        backgroundImage: true,
        cards: {populate: {links: {populate: LINK_POPULATE}}},
        primaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.numbered-steps': {
    Component: NumberedSteps,
    // Each step's tags are a nested repeatable, so the steps need their own
    // populate. Notes hold only scalars. The closing CTA's button is a link,
    // so its relations are named.
    options: {
      populate: {
        steps: {populate: {tags: true}},
        notes: true,
        primaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.reference-guide': {
    Component: ReferenceGuide,
    options: {
      populate: {
        columns: true,
        image: true,
        primaryCTA: {populate: LINK_POPULATE},
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
            link: {populate: LINK_POPULATE},
          },
        },
        note: true,
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
            primaryCTA: {populate: LINK_POPULATE},
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
        bannerCta: {populate: LINK_POPULATE},
        items: {
          populate: {
            image: true,
            link: {populate: LINK_POPULATE},
          },
        },
      },
    },
  },
  'module.course-cards': {
    Component: CourseCards,
    // Each course's registration link reaches pages/collections/uses, so it
    // needs LINK_POPULATE; the photo is the module's one media field.
    options: {
      populate: {
        backgroundImage: true,
        courses: {populate: {registerLink: {populate: LINK_POPULATE}}},
      },
    },
  },
  'module.cta-banner': {
    Component: CtaBanner,
    options: {
      populate: {
        backgroundImage: true,
        primaryCTA: {populate: LINK_POPULATE},
        secondaryCTA: {populate: LINK_POPULATE},
      },
    },
  },
  'module.spec-sheet': {
    Component: SpecSheet,
    // The spec rows and the note are scalars only, so `true` is enough.
    options: {
      populate: {
        specs: true,
        note: true,
      },
    },
  },
  'module.stat-banner': {
    Component: StatBanner,
    // Scalars plus the photo — no buttons, so no link relations to name.
    options: {
      populate: {
        backgroundImage: true,
      },
    },
  },
  'module.stats-comparison': {
    Component: StatsComparison,
    // Scalars all the way down, but the table's rows nest their values one
    // level deeper, so that level is named — as in module.pricing.
    options: {
      populate: {
        stats: true,
        comparisonColumns: true,
        comparisonRows: {populate: {planValues: true}},
      },
    },
  },
  'module.step-guide': {
    Component: StepGuide,
    options: {
      populate: {
        steps: {populate: {image: true}},
        primaryCTA: {populate: LINK_POPULATE},
        note: true,
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
            link: {populate: LINK_POPULATE},
          },
        },
      },
    },
  },
  'module.testimonial-strip': {
    Component: TestimonialStrip,
    // Scalars plus the photo — no links to name.
    options: {
      populate: {
        backgroundImage: true,
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
  'module.video-library': {
    Component: VideoLibrary,
    // Scalars only; the videos come from the route loader (lib/videos).
    options: {populate: '*'},
  },
  'module.wysiwyg': {
    Component: Wysiwyg,
    options: {
      populate: '*',
    },
  },
  /*
   * Blog Modules (Strapi category "blog-modules") — the body blocks of a blog
   * post, offered only in the Blogs collection type's modules zone.
   */
  'blog-modules.cta-card': {
    Component: BlogCtaCard,
    options: {
      populate: {
        image: true,
        link: {populate: LINK_POPULATE},
      },
    },
  },
  'blog-modules.image': {
    Component: BlogImage,
    options: {
      populate: {image: true},
    },
  },
  'blog-modules.image-row': {
    Component: BlogImageRow,
    options: {
      populate: {images: true},
    },
  },
  'blog-modules.note': {
    Component: BlogNote,
    // Scalars only — the heading and the body's HTML.
    options: {
      populate: '*',
    },
  },
  'blog-modules.video': {
    Component: BlogVideo,
    // Scalars only — the YouTube link.
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
