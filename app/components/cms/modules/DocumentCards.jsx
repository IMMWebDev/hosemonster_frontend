import CmsLink from '~/components/cms/CmsLink';
import UiIcon from '~/components/icons/UiIcon';
import {linkDestination} from '~/lib/cms-links';
import {noteBodyHtml} from '~/lib/cms-note';
import {strapiMedia, documentThumbnail} from '~/lib/strapi-media';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
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
 * Optional extras from sprint-05 hifi_hydrantflowtesting.html, "From the
 * reading to the report": an eyebrow over each card title ("Capture · Smart
 * Monster™"), and a note under the row — an asterisk tile, then the note's
 * heading in bold before its body ("Still running analog gauges? …").
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     background?: 'white' | 'grey',
 *     note?: {heading?: string, body?: string} | null,
 *     items?: Array<{
 *       id: number,
 *       image?: {url?: string, mime?: string, alternativeText?: string},
 *       eyebrow?: string,
 *       title: string,
 *       description?: string,
 *       link?: object,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function DocumentCards({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const {eyebrow, heading, body, background, note, items = []} = data ?? {};

  if (!heading) return null;

  const backgroundClass = background === 'grey' ? styles.grey : '';

  // The shared utilities.note component: Heading in bold at the start of the
  // Body's first paragraph. See lib/cms-note.js.
  const noteHtml = noteBodyHtml(note?.body, {leadIn: note?.heading, trackId});

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
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

        {noteHtml ? (
          <div
            className={styles.note}
            data-reveal
            style={{'--reveal-i': items.length + 3}}
          >
            <span className={styles.noteIcon}>
              <UiIcon name="asterisk" size={18} />
            </span>
            <div
              className={`${styles.noteText} cms-note-body`}
              dangerouslySetInnerHTML={{__html: noteHtml}}
            />
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
  const trackId = useTrackId();
  const {image, eyebrow, title, description, link} = item;

  // 116px wide in the CSS, at 2x.
  const thumbUrl = documentThumbnail(image, baseUrl, {width: 232});
  const fileUrl = strapiMedia(image?.url, baseUrl);

  /*
   * Where the button goes, in order: an explicit destination, else the file.
   *
   * "Explicit" means ANY of the four destinations utilities.link models — a
   * typed URL, a page, collection or use-page relation. Checking only linkUrl
   * would ignore a card pointed at a CMS page and silently open the PDF
   * instead. A "#" placeholder counts too: editors use it while the real page
   * is still being built.
   *
   * Nothing here depends on the media field. A card with a link and no upload
   * renders fine — it just has no thumbnail.
   */
  const hasDestination = Boolean(linkDestination(link));
  const fallbackHref = hasDestination ? null : fileUrl;
  const label = link?.linkText || 'View document';

  /*
   * Cards usually share a button label ("See a sample report"), so a screen
   * reader's links list would hear the same link twice. The card's title, and
   * "PDF" when that's what opens, go into the button's name, unseen.
   */
  const opensPdf = hasDestination
    ? /\.pdf(?:$|[?#])/i.test(linkDestination(link))
    : image?.mime === 'application/pdf';
  const which = [title?.trim(), opensPdf ? 'PDF' : ''].filter(Boolean);
  const buttonText = (
    <>
      {label}
      {which.length > 0 ? (
        <span className="sr-only">, {which.join(', ')}</span>
      ) : null}
    </>
  );
  // The button is the card's only control, so it takes the card's role —
  // the same one whichever of the two branches below renders it.
  const trackRole = `card-${index + 1}`;

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
          width="116"
          height="150"
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div className={styles.cardText}>
        {eyebrow ? <p className={styles.cardEyebrow}>{eyebrow}</p> : null}
        <h3 className={styles.cardTitle}>{title}</h3>
        {description ? (
          <p className={styles.cardDescription}>{description}</p>
        ) : null}

        {hasDestination ? (
          <CmsLink
            link={link}
            className={`btn btn--secondary ${styles.cardCta}`}
            trackRole={trackRole}
          >
            {buttonText}
          </CmsLink>
        ) : fallbackHref ? (
          /*
             A plain anchor, not CmsLink: this destination is a file on the
             media CDN rather than anything the CMS link component models.
          */
          <a
            className={`btn btn--secondary ${styles.cardCta}`}
            href={fallbackHref}
            data-track-id={trackId(trackRole)}
            /* openNewTab is the editor's call, exactly as it is for every other
               link on the site — CmsLink reads the same field. Not assumed here
               just because the destination happens to be a PDF. */
            target={link?.openNewTab ? '_blank' : undefined}
            rel={link?.openNewTab ? 'noopener noreferrer' : undefined}
          >
            {buttonText}
            {/* CmsLink announces a new tab itself; this anchor isn't CmsLink. */}
            {link?.openNewTab ? (
              <span className="sr-only"> (opens in a new tab)</span>
            ) : null}
          </a>
        ) : null}
      </div>
    </div>
  );
}
