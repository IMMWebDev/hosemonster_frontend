import {NavLink} from 'react-router';
import CmsLink from '~/components/cms/CmsLink';
import {SocialIcon} from '~/components/icons/SocialIcon';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './Footer.module.css';

/**
 * Site footer — Figma "Web Styleguide" → Nav + Footer → Footer Only (27:1154).
 *
 * Entirely CMS-driven (Strapi `footer` single type). The Shopify footer menu is
 * no longer rendered: the design's four columns are editorial groupings that
 * don't map onto a Shopify menu, and having two sources would let them drift.
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
    legalNote,
  } = cmsFooter;

  const logoUrl = strapiMedia(cmsFooter.logo?.url, strapiBaseUrl);
  // Alt comes from the Media Library's own alternativeText (set once on the
  // upload) rather than a per-placement CMS field.
  const logoAlt =
    cmsFooter.logo?.alternativeText || copyrightName || header?.shop?.name || '';

  return (
    <footer className={styles.footer}>
      <div
        className={styles.inner}
        // Drives the grid track count so adding a column in Strapi needs no
        // CSS change. See --footer-columns in Footer.module.css.
        style={{'--footer-columns': linkColumns.length || 4}}
      >
        <div className={styles.brand}>
          <NavLink to="/" className={styles.logo} prefetch="intent" end>
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
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={styles.contactLine}>
                {phone}
              </a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} className={styles.contactLine}>
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
                >
                  <SocialIcon
                    platform={social.platform}
                    className={styles.socialIcon}
                    title={social.label || social.platform}
                  />
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
                  <CmsLink link={link} className={styles.columnLink} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <hr className={styles.divider} />

      <div className={styles.legal}>
        <p className={styles.legalText}>
          © {new Date().getFullYear()}
          {copyrightName ? ` ${copyrightName}` : ''}
          {legalLinks.map((link) => (
            <span key={link.id}>
              <span className={styles.legalSeparator} aria-hidden="true">
                {' · '}
              </span>
              <CmsLink link={link} className={styles.legalLink} />
            </span>
          ))}
          {legalNote ? (
            <>
              <span className={styles.legalSeparator} aria-hidden="true">
                {' · '}
              </span>
              {legalNote}
            </>
          ) : null}
        </p>
      </div>
    </footer>
  );
}

/**
 * @typedef {Object} FooterProps
 * @property {HeaderQuery} [header]
 * @property {Record<string, any>} [cmsFooter]
 * @property {string} [strapiBaseUrl]
 */

/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
