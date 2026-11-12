import {NavLink} from 'react-router';
import PhoneLink from '~/components/PhoneLink';
import CmsLink from '~/components/cms/CmsLink';
import {SocialIcon} from '~/components/icons/SocialIcon';
import {strapiMedia} from '~/lib/strapi-media';
import {slugify, TrackingScope} from '~/lib/tracking';
import styles from './Footer.module.css';

/**
 * Site footer — Figma "Web Styleguide" → Nav + Footer → Footer Only (27:1154).
 *
 * Entirely CMS-driven (Strapi `footer` single type). The Shopify footer menu is
 * no longer rendered: the design's four columns are editorial groupings that
 * don't map onto a Shopify menu, and having two sources would let them drift.
 *
 * Tracking scope "footer" (app/lib/tracking.js). The scope is set up here, so
 * this component's own controls carry literal ids; CmsLink and PhoneLink read
 * the scope themselves. Link roles come from the column heading and label.
 *
 * @param {FooterProps}
 */
export function Footer({header, cmsFooter, strapiBaseUrl}) {
  if (!cmsFooter) return null;

  const {
    address,
    phone,
    email,
    socialLinks = [],
    linkColumns = [],
    copyrightName,
    legalLinks = [],
  } = cmsFooter;

  const logoUrl = strapiMedia(cmsFooter.logo?.url, strapiBaseUrl);
  // Alt comes from the Media Library's own alternativeText (set once on the
  // upload) rather than a per-placement CMS field.
  const logoAlt =
    cmsFooter.logo?.alternativeText || copyrightName || header?.shop?.name || '';

  return (
    <TrackingScope id="footer">
      <footer className={styles.footer} data-track-module="footer">
        <div
          className={styles.inner}
          // Drives the grid track count so adding a column in Strapi needs no
          // CSS change. See --footer-columns in Footer.module.css.
          style={{'--footer-columns': linkColumns.length || 4}}
        >
          <div className={styles.brand}>
            <NavLink
              to="/"
              className={styles.logo}
              prefetch="intent"
              end
              data-track-id="footer__logo"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAlt}
                  className={styles.logoImage}
                  width={cmsFooter.logo?.width ?? 185}
                  height={cmsFooter.logo?.height ?? 48}
                />
              ) : (
                <span className={styles.logoFallback}>{logoAlt}</span>
              )}
            </NavLink>

            <div className={styles.contact}>
              {address ? <p className={styles.contactLine}>{address}</p> : null}
              {phone ? (
                <PhoneLink phone={phone} className={styles.contactLine} />
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className={styles.contactLine}
                  data-track-id="footer__email"
                >
                  {email}
                </a>
              ) : null}
            </div>

            {socialLinks.length > 0 && (
              <div className={styles.social}>
                {socialLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    className={styles.socialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-track-id={`footer__social-${slugify(social.platform)}`}
                  >
                    <SocialIcon
                      platform={social.platform}
                      className={styles.socialIcon}
                      title={social.label || social.platform}
                    />
                    {/* Here, not in the icon's title, so the hover tooltip
                        stays just the platform name. */}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {linkColumns.map((column) => (
            <div className={styles.column} key={column.id}>
              <h2 className={styles.columnHeading}>{column.heading}</h2>
              <ul className={styles.columnLinks}>
                {(column.links ?? []).map((link) => (
                  <li key={link.id}>
                    <CmsLink
                      link={link}
                      className={styles.columnLink}
                      trackRole={`${column.heading ?? ''}-${link.linkText ?? ''}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className={styles.divider} />

        {/*
          Copyright left, legal links right — the conventional split. They used to
          run together as one sentence separated by middots, which read as a list
          of links with a date stuck on the front.
        */}
        <div className={styles.legal}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()}
            {copyrightName ? ` ${copyrightName}` : ''}
          </p>
          {legalLinks.length > 0 ? (
            <ul className={styles.legalLinks}>
              {legalLinks.map((link) => (
                <li key={link.id}>
                  <CmsLink
                    link={link}
                    className={styles.legalLink}
                    trackRole={`legal-${link.linkText ?? ''}`}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </footer>
    </TrackingScope>
  );
}

/**
 * @typedef {Object} FooterProps
 * @property {HeaderQuery} [header]
 * @property {Record<string, any>} [cmsFooter]
 * @property {string} [strapiBaseUrl]
 */

/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
