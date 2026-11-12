import CmsLink from '~/components/cms/CmsLink';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {SocialIcon} from '~/components/icons/SocialIcon';
import {linkDestination} from '~/lib/cms-links';
import {strapiMedia} from '~/lib/strapi-media';
import styles from './AuthorCard.module.css';

/**
 * The author card beside a blog post — sprint-05 hifi_blogposttemplate.html.
 *
 * Built from the post's Author (the Authors collection type): Photo, Name,
 * Title, Bio, a View Bio link to the author's Path, and the Social Links as
 * icons — the platform is read from each link's address (LinkedIn, X,
 * Facebook, Instagram, YouTube…); an address it doesn't recognise shows the
 * link's text instead. Each part is optional; a post with no author shows no
 * card.
 *
 * Rendered inside BlogBody's tracking scope, so the links' data-track-ids are
 * "{page}__post-aside__view-bio" and "…__social-{platform}".
 *
 * @param {{
 *   author?: {
 *     name?: string,
 *     bio?: string,
 *     title?: string,
 *     path?: string,
 *     photo?: {url?: string} | null,
 *     socialLinks?: Array<object> | null,
 *   } | null,
 *   baseUrl?: string,
 *   className?: string,
 * }} props
 */
export default function AuthorCard({author, baseUrl, className = ''}) {
  if (!author?.name) return null;

  const photo = strapiMedia(author.photo?.url, baseUrl);
  const socials = (author.socialLinks ?? [])
    .map((link) => ({link, platform: platformOf(linkDestination(link))}))
    .filter(({link, platform}) => platform || link.linkText);

  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.head}>
        {photo ? (
          /* Decorative: the name sits right beside it. */
          <img
            src={photo}
            alt=""
            width="60"
            height="60"
            className={styles.photo}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className={styles.who}>
          <p className={styles.name}>
            <RaisedMarks text={author.name} />
          </p>
          {author.title ? <p className={styles.title}>{author.title}</p> : null}
        </div>
      </div>

      {author.bio ? <p className={styles.bio}>{author.bio}</p> : null}

      {author.path || socials.length > 0 ? (
        <div className={styles.foot}>
          {author.path ? (
            <CmsLink
              link={{linkText: 'View Bio', linkUrl: author.path}}
              className={styles.link}
              trackRole="view-bio"
              markCurrent={false}
            >
              View Bio
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

          {socials.length > 0 ? (
            <ul className={styles.socials}>
              {socials.map(({link, platform}, i) => (
                <li key={link.id ?? i}>
                  <CmsLink
                    link={link}
                    className={platform ? styles.social : styles.link}
                    trackRole={`social-${platform ?? i + 1}`}
                    markCurrent={false}
                  >
                    {platform ? (
                      <SocialIcon
                        platform={platform}
                        size={16}
                        title={link.linkText || PLATFORM_NAMES[platform]}
                      />
                    ) : (
                      link.linkText
                    )}
                  </CmsLink>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Address host → SocialIcon platform. */
const PLATFORM_HOSTS = {
  'linkedin.com': 'linkedin',
  'x.com': 'x',
  'twitter.com': 'x',
  'facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'flickr.com': 'flickr',
  'soundcloud.com': 'soundcloud',
  'spotify.com': 'spotify',
};

const PLATFORM_NAMES = {
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  flickr: 'Flickr',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
};

/**
 * The platform a social link points at, from its address — null for one that
 * isn't a known platform (or isn't an absolute address).
 *
 * @param {string} href
 * @returns {string | null}
 */
function platformOf(href) {
  let host;
  try {
    host = new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  const match = Object.keys(PLATFORM_HOSTS).find(
    (known) => host === known || host.endsWith(`.${known}`),
  );
  return match ? PLATFORM_HOSTS[match] : null;
}
