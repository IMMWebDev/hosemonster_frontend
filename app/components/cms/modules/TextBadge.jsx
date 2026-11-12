import CmsLink from '~/components/cms/CmsLink';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {linkDestination} from '~/lib/cms-links';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './TextBadge.module.css';

/**
 * Text & Badge module — sprint-05 hifi_hmuhub.html, "Certification".
 *
 * A badge (the HMU seal) shown whole and small beside a block of copy:
 * eyebrow, heading, a bold lead line, body paragraphs and an arrow link.
 *
 * Distinct from Text & Media, which gives its image half the band and runs
 * the heading above the image when the image is on the left. Here the badge
 * is a mark, not a picture: up to 240px, uncropped, unframed, and the heading
 * stays with the copy.
 *
 * The badge's alt text comes from its Alternative Text in the Media Library;
 * left empty it's decorative, since the heading beside it says what it is.
 *
 * Desktop: badge and copy side by side. Narrow screens: the copy wraps under
 * the badge (the comp's flex-wrap), the badge shrinking to a third of the
 * width.
 *
 * @param {{
 *   data: {
 *     badge?: {url?: string, alternativeText?: string, width?: number, height?: number} | null,
 *     eyebrow?: string,
 *     heading?: string,
 *     lead?: string,
 *     body?: string,
 *     link?: object | null,
 *     background?: 'grey' | 'white' | null,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function TextBadge({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const {badge, eyebrow, heading, lead, body, link, background} = data ?? {};
  if (!heading) return null;

  const badgeUrl = strapiMedia(badge?.url, baseUrl);

  // Blank lines in the CMS start new paragraphs, as in Text & Media.
  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const hasLink = Boolean(link?.linkText && linkDestination(link));

  /*
   * Grey is the default as drawn. Strapi applies an enum default on create
   * only, so anything that isn't "white" — null included — is grey.
   */
  const backgroundClass = background === 'white' ? '' : styles.grey;

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
      <div className={styles.inner}>
        {badgeUrl ? (
          <div className={styles.badge} data-reveal="zoom">
            <img
              src={badgeUrl}
              alt={badge?.alternativeText ?? ''}
              className={styles.badgeImage}
              width={badge?.width}
              height={badge?.height}
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null}

        <div className={styles.copy}>
          {eyebrow ? (
            <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
              {eyebrow}
            </p>
          ) : null}
          <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
            <RaisedMarks text={heading} />
          </h2>
          {lead ? (
            <p className={styles.lead} data-reveal style={{'--reveal-i': 2}}>
              {lead}
            </p>
          ) : null}
          {paragraphs.length > 0 ? (
            <div className={styles.body} data-reveal style={{'--reveal-i': 3}}>
              {paragraphs.map((para, i) => (
                // The pieces of one fixed string, never reordered.
                // eslint-disable-next-line react/no-array-index-key
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : null}
          {hasLink ? (
            <CmsLink
              link={link}
              className={styles.link}
              trackRole="link"
              dataReveal
              style={{'--reveal-i': 4}}
            >
              {link.linkText}
              <svg
                className={styles.chevron}
                width="6"
                height="11"
                viewBox="-12 -12 682 1229"
                aria-hidden="true"
                focusable="false"
              >
                <polygon
                  points="0,0 225,0 658,602 225,1205 0,1205 423,602"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="24"
                  strokeLinejoin="round"
                />
              </svg>
            </CmsLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
