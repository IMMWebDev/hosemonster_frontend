import {useEffect} from 'react';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './Newsletter.module.css';

/**
 * Newsletter module — Figma "Homepage" → Footer with newsletter → Newsletter.
 *
 * Full-bleed signup band. The email field and button are an embedded HubSpot
 * form, so the CMS holds only the form ID — the input, its label, validation
 * and the thank-you message all live in HubSpot. Page-agnostic.
 *
 * @param {{
 *   data: {
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
export default function Newsletter({data, baseUrl, siteEnv}) {
  const {eyebrow, heading, body, hubspotFormId} = data ?? {};
  const portalId = siteEnv?.hubspotPortalId;
  const region = siteEnv?.hubspotRegion || 'na1';

  if (!heading) return null;

  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);
  // Both halves are required: the script is per-portal, the form is per-id.
  const canEmbed = Boolean(hubspotFormId && portalId);

  return (
    <section className={styles.section}>
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
        <div className={styles.copy}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.heading}>{heading}</h2>
          {body ? <p className={styles.body}>{body}</p> : null}
        </div>

        <div className={styles.formColumn}>
          {canEmbed ? (
            <HubSpotForm
              portalId={portalId}
              region={region}
              formId={hubspotFormId}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Embeds a HubSpot form.
 *
 * Uses HubSpot's current embed: a container carrying `hs-form-frame` plus the
 * per-portal loader script, which finds the container by that class and its
 * data attributes. The older `hbspt.forms.create` v2 script is not used.
 *
 * The class name and data attributes are HubSpot's contract, so they are
 * written literally rather than through CSS Modules — scoping them would hide
 * the container from HubSpot's script and nothing would render.
 *
 * @param {{portalId: string, region: string, formId: string}} props
 */
function HubSpotForm({portalId, region, formId}) {
  useEffect(() => {
    const src = `https://js.hsforms.net/forms/embed/${portalId}.js`;
    // The script scans for every `.hs-form-frame` on the page, so one copy
    // serves any number of forms. Appending it per instance would load it
    // repeatedly and can produce duplicate submissions.
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
    // Deliberately NOT removed on unmount: other Newsletter instances may still
    // rely on it, and re-adding it on every navigation would re-run HubSpot's
    // initialisation against forms that are already mounted.
  }, [portalId]);

  return (
    <div
      className="hs-form-frame"
      data-region={region}
      data-form-id={formId}
      data-portal-id={portalId}
    />
  );
}
