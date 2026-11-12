import {useRouteLoaderData} from 'react-router';
import HubSpotForm from '~/components/HubSpotForm';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './TextForm.module.css';

/**
 * Text & Form module — sprint-04 hifi_smartmonsterfeature.html,
 * "Request a demo".
 *
 * Heading and copy on the left, an embedded HubSpot form on the right. As with
 * the Newsletter card, the CMS holds only the form ID: the fields, button,
 * routing and thank-you message are built in HubSpot. With no form ID (or no
 * portal configured) only the copy renders.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     hubspotFormId?: string,
 *     background?: 'white' | 'grey' | 'navy',
 *   },
 * }} props
 */
export default function TextForm({data}) {
  const trackingRoot = useTrackingRoot();
  const {eyebrow, heading, body, hubspotFormId, background} = data ?? {};
  // The portal id and region come from the environment via the root loader,
  // the same values the Newsletter card uses.
  const siteEnv = useRouteLoaderData('root')?.siteEnv;

  if (!heading) return null;

  const portalId = siteEnv?.hubspotPortalId;
  const region = siteEnv?.hubspotRegion || 'na1';
  const canEmbed = Boolean(hubspotFormId && portalId);

  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Only "grey" and "navy" get a class; an entry made before the field
  // existed comes back null, which is white. Navy is a rounded dark panel
  // inside a white band (sprint-05 hifi_hmuhub.html, "Group training"), not
  // a full-bleed fill.
  const backgroundClass =
    {grey: styles.grey, navy: styles.navy}[background] ?? '';

  return (
    <section
      {...trackingRoot}
      className={`${styles.section} ${backgroundClass}`.trim()}
    >
      <div className={styles.inner}>
        <div
          className={`${styles.panel} ${canEmbed ? '' : styles.copyOnly}`.trim()}
        >
          <div className={styles.copy}>
            {eyebrow ? (
              <p
                className={styles.eyebrow}
                data-reveal
                style={{'--reveal-i': 0}}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              className={styles.heading}
              data-reveal
              style={{'--reveal-i': 1}}
            >
              {heading}
            </h2>
            {paragraphs.length > 0 ? (
              <div
                className={styles.body}
                data-reveal
                style={{'--reveal-i': 2}}
              >
                {paragraphs.map((para, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : null}
          </div>

          {canEmbed ? (
            <div
              className={styles.formColumn}
              data-reveal
              style={{'--reveal-i': 2}}
            >
              <HubSpotForm
                portalId={portalId}
                region={region}
                formId={hubspotFormId}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
