import {useId, useState} from 'react';
import {Link} from 'react-router';
import Drawer, {MOBILE_MENU_ID} from '~/components/Drawer';
import {useAside} from '~/components/Aside';
import CmsLink from '~/components/cms/CmsLink';
import UiIcon from '~/components/icons/UiIcon';
import {strapiMedia} from '~/lib/strapi-media';
import {CONTACT_PATH} from '~/lib/search';
import styles from './MobileMenu.module.css';

/**
 * The tablet and phone menu: the header's drawer (components/Drawer.jsx),
 * dressed as the brand rather than a list of links.
 *
 *  - Head: the logo, linking home, where the drawer used to say "Menu".
 *  - Body: the CMS main nav in the display face, one ruled row per item; a
 *    dropdown's children ease open under it.
 *  - Foot: a navy band with Shop equipment and Contact us.
 *
 * The nav and logo come from the same Strapi Header the desktop header uses,
 * so the two can't drift apart.
 *
 * @param {{
 *   cmsHeader?: Record<string, any>,
 *   strapiBaseUrl?: string,
 * }} props
 */
export default function MobileMenu({cmsHeader, strapiBaseUrl}) {
  const {close} = useAside();
  const mainNav = cmsHeader?.mainNav ?? [];
  if (mainNav.length === 0) return null;

  const logoUrl = strapiMedia(cmsHeader?.logo?.url, strapiBaseUrl);
  const logoAlt = cmsHeader?.logo?.alternativeText || 'Hose Monster home';

  return (
    <Drawer type="mobile" id={MOBILE_MENU_ID} label="Menu">
      <Drawer.Head
        title="Menu"
        brand={
          <Link to="/" className={styles.logo} onClick={close} prefetch="intent">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAlt}
                className={styles.logoImage}
                width={cmsHeader?.logo?.width ?? 185}
                height={cmsHeader?.logo?.height ?? 48}
              />
            ) : (
              <span className={styles.logoFallback}>Hose Monster</span>
            )}
          </Link>
        }
      />

      <Drawer.Body className={styles.body}>
        <nav aria-label="Main">
          <ul className={styles.list} role="list">
            {mainNav.map((item, i) => (
              <li key={item.id ?? i} className={styles.item}>
                {item?.isDropdown && (item.dropdownLinks?.length ?? 0) > 0 ? (
                  <NavGroup item={item} onNavigate={close} />
                ) : (
                  <CmsLink link={item?.link} className={styles.link} onClick={close} />
                )}
              </li>
            ))}
          </ul>
        </nav>
      </Drawer.Body>

      <Drawer.Foot className={styles.foot}>
        <div className={styles.actions}>
          <Link to="/shop" className={`btn btn--primary ${styles.action}`} onClick={close}>
            Shop equipment
          </Link>
          <Link to={CONTACT_PATH} className={`btn btn--inverse-navy ${styles.action}`} onClick={close}>
            Contact us
          </Link>
        </div>

      </Drawer.Foot>
    </Drawer>
  );
}

/**
 * A dropdown from the main nav. With a destination of its own the label is
 * a link and the chevron a separate toggle; without one the whole row is the
 * toggle. The children ease open (grid rows, as the product page accordion).
 *
 * @param {{item: {link?: object, dropdownLinks?: Array<object>}, onNavigate: () => void}} props
 */
function NavGroup({item, onNavigate}) {
  const {link, dropdownLinks = []} = item;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const label = link?.linkText ?? '';
  const to = link?.linkUrl || link?.pageLink?.path || link?.collectionLink?.path;
  const linked = Boolean(to) && to !== '#';
  const toggle = () => setOpen((v) => !v);

  const chevron = <UiIcon name="chevron" size={18} className={styles.chevron} />;

  return (
    <div className={styles.group} data-open={open || undefined}>
      {linked ? (
        <div className={styles.row}>
          <CmsLink link={link} className={styles.link} onClick={onNavigate} />
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${label} menu`}
            onClick={toggle}
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.link} ${styles.rowButton}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span>{label}</span>
          <span className={styles.toggleIcon}>{chevron}</span>
        </button>
      )}

      <div id={panelId} className={styles.panel}>
        <div className={styles.panelInner}>
          <ul className={styles.subList} role="list">
            {dropdownLinks.map((child, i) => (
              <li key={child.id ?? i}>
                <CmsLink link={child} className={styles.subLink} onClick={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
