import CmsLink from '~/components/cms/CmsLink';
import {strapiMedia, documentThumbnail} from '~/lib/strapi-media';
import styles from './DocumentCards.module.css';

/**
 * Document Cards module — sprint-04 hifi_fireflow.html, "Sample reports".
 *
 * An intro lockup over a row of wide cards, each pairing a document thumbnail
 * with a title, a line of copy and a button.
 *
 * ONE UPLOAD PER CARD. The `image` field takes the PDF itself, not a separately
 * exported cover: Cloudinary renders page 1 as a JPEG for the thumbnail (see
 * documentThumbnail in lib/strapi-media.js) and the same asset is what the
 * button opens. An editor uploading a real image instead still works — the
 * helper passes non-PDFs straight through.
 *
 * The comp's button is an expander that reveals the same thumbnail 36px larger,
 * captioned "Full sample report preview". That is a placeholder for showing the
 * real document, so this opens the document instead.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     background?: 'white' | 'grey',
 *     items?: Array<{
 *       id: number,
 *       image?: {url?: string, mime?: string, alternativeText?: string},
 *       title: string,
 *       description?: string,
 *       link?: object,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function DocumentCards({data, baseUrl}) {
  const {eyebrow, heading, body, background, items = []} = data ?? {};

  if (!heading) return null;

  const backgroundClass = background === 'grey' ? styles.grey : '';

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className={`${styles.section} ${backgroundClass}`.trim()}>
      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}

        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          {heading}
        </h2>

        {paragraphs.length > 0 ? (
          <div className={styles.body} data-reveal style={{'--reveal-i': 2}}>
            {paragraphs.map((para, i) => (
              <p key={`para-${i}`}>{para}</p>
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className={styles.grid}>
            {items.map((item, i) => (
              <Card
                key={item.id ?? i}
                item={item}
                baseUrl={baseUrl}
                index={i}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * @param {{item: object, baseUrl?: string, index?: number}} props
 */
function Card({item, baseUrl, index = 0}) {
  const {image, title, description, link} = item;

  const thumbUrl = documentThumbnail(image, baseUrl);
  const fileUrl = strapiMedia(image?.url, baseUrl);

  /*
   * Where the button goes, in order: an explicit destination, else the file.
   *
   * "Explicit" means ANY of the three destinations utilities.link models — a
   * typed URL, a page relation or a collection relation. Checking only linkUrl
   * would ignore a card pointed at a CMS page and silently open the PDF
   * instead. A bare "#" does not count: it is what the link component leaves
   * behind when someone fills in the text and not the destination.
   *
   * Nothing here depends on the media field. A card with a link and no upload
   * renders fine — it just has no thumbnail.
   */
  const hasDestination = Boolean(
    (link?.linkUrl && link.linkUrl !== '#') ||
    link?.pageLink?.path ||
    link?.collectionLink?.path,
  );
  const fallbackHref = hasDestination ? null : fileUrl;
  const label = link?.linkText || 'View document';

  return (
    <div className={styles.card} data-reveal style={{'--reveal-i': index + 3}}>
      {thumbUrl ? (
        <img
          src={thumbUrl}
          /* Decorative: the title beside it names the document, and the button
             is what carries the action. An alt describing a page thumbnail
             would just be read as noise before the real label. */
          alt=""
          className={styles.thumb}
          width="92"
          height="119"
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div className={styles.cardText}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {description ? (
          <p className={styles.cardDescription}>{description}</p>
        ) : null}

        {hasDestination ? (
          <CmsLink
            link={link}
            className={`btn btn--secondary ${styles.cardCta}`}
          />
        ) : fallbackHref ? (
          /*
             A plain anchor, not CmsLink: this destination is a file on the
             media CDN rather than anything the CMS link component models.
          */
          <a
            className={`btn btn--secondary ${styles.cardCta}`}
            href={fallbackHref}
            /* openNewTab is the editor's call, exactly as it is for every other
               link on the site — CmsLink reads the same field. Not assumed here
               just because the destination happens to be a PDF. */
            target={link?.openNewTab ? '_blank' : undefined}
            rel={link?.openNewTab ? 'noopener noreferrer' : undefined}
          >
            {label}
          </a>
        ) : null}
      </div>
    </div>
  );
}
