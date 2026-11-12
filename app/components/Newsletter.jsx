import {useId} from 'react';
import HubSpotForm from '~/components/HubSpotForm';
import {strapiMedia} from '~/lib/strapi-media';
import {TrackingScope} from '~/lib/tracking';
import styles from './Newsletter.module.css';

/**
 * Newsletter card — sprint-04 hifis, above the footer ("Flow testing tips, no
 * fluff."); originally Figma "Homepage" → Footer with newsletter.
 *
 * Site-wide chrome, not a page module: the content is edited once on the
 * Options single type and this renders directly above the footer on every page
 * whose `includeNewsletter` is not switched off.
 *
 * The email field and button are an embedded HubSpot form, so the CMS holds
 * only the form ID — the input, its label, validation and the thank-you
 * message all live in HubSpot.
 *
 * Tracking scope "newsletter" (app/lib/tracking.js). The form's own field and
 * button are rendered by HubSpot's script, so they can't carry ids — a tag
 * targets them inside [data-track-module="newsletter"].
 *
 * @param {{
 *   newsletter?: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     hubspotFormId?: string,
 *     backgroundImage?: {url?: string},
 *   },
 *   baseUrl?: string,
 *   siteEnv?: {hubspotPortalId?: string, hubspotRegion?: string},
 * }} props
 */
export default function Newsletter({newsletter, baseUrl, siteEnv}) {
  const data = newsletter;
  const {eyebrow, heading, body, hubspotFormId} = data ?? {};
  const portalId = siteEnv?.hubspotPortalId;
  const region = siteEnv?.hubspotRegion || 'na1';
  const headingId = useId();

  if (!heading) return null;

  const backgroundUrl = strapiMedia(data?.backgroundImage?.url, baseUrl);
  // Both halves are required: the script is per-portal, the form is per-id.
  const canEmbed = Boolean(hubspotFormId && portalId);

  return (
    <TrackingScope id="newsletter">
      {/* Named by its heading, which makes it a region landmark. It renders
          between <main> and <footer>, so without a name it sits outside
          every landmark and landmark navigation skips the signup. */}
      <section
        className={styles.section}
        data-track-module="newsletter"
        aria-labelledby={headingId}
      >
        <div className={styles.container}>
          {/* An inset rounded card inside the content column, per the comp —
              it used to be a full-bleed band. */}
          <div className={styles.card}>
            {backgroundUrl ? (
              <img
                src={backgroundUrl}
                /* Decorative — the heading carries the meaning. */
                alt=""
                className={styles.backgroundImage}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className={styles.wash} aria-hidden="true" />

            <div className={styles.inner}>
              <div className={styles.copy} data-reveal>
                {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
                <h2 id={headingId} className={styles.heading}>
                  {heading}
                </h2>
                {body ? <p className={styles.body}>{body}</p> : null}
              </div>

              <div
                className={styles.formColumn}
                data-reveal
                style={{'--reveal-i': 1}}
              >
                {canEmbed ? (
                  <HubSpotForm
                    portalId={portalId}
                    region={region}
                    formId={hubspotFormId}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </TrackingScope>
  );
}
