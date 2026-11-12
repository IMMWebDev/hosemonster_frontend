import {useRouteLoaderData} from 'react-router';
import CmsLink from '~/components/cms/CmsLink';
import {JsonLd} from '~/components/JsonLd';
import {absoluteUrl, coursesJsonLd} from '~/lib/seo';
import RaisedMarks from '~/components/cms/RaisedMarks';
import {linkDestination} from '~/lib/cms-links';
import {
  courseToday,
  formatCourseDates,
  upcomingCourses,
} from '~/lib/course-dates';
import {strapiMedia} from '~/lib/strapi-media';
import {useTrackingRoot} from '~/lib/tracking';
import styles from './CourseCards.module.css';

const DEFAULT_EMPTY = 'New sessions are on the way. Check back soon.';

/**
 * Course Cards module — sprint-05 hifi_hmuhub.html, "Upcoming courses".
 *
 * A full-bleed navy band: heading and a line of copy, then a card per
 * training session — dates and an optional status tag, the city, the
 * session's title, and a registration link.
 *
 * Sessions look after themselves: they sort by start date and drop off the
 * day after they end (lib/course-dates), so the page never lists a course
 * that has already run. With none left, the band stays — the HMU page's "See
 * Upcoming Courses" button jumps here — and says so instead of showing an
 * empty row.
 *
 * The card lifts on hover, as the comp draws it, but the registration link
 * is the one target: its arrow only moves when the pointer is on the link
 * itself (the same split as Link Cards' and Numbered Link Cards' cards). The
 * lift lives on an inner wrapper so it doesn't fight the scroll-in reveal,
 * which owns the <li>'s transform and transitions.
 *
 * Cards share the row: one or two sessions stretch across it, three or more
 * sit at least 340px wide and wrap — the comp's auto-fit grid.
 *
 * @param {{
 *   data: {
 *     eyebrow?: string,
 *     heading?: string,
 *     body?: string,
 *     emptyMessage?: string,
 *     backgroundImage?: {url?: string} | null,
 *     courses?: Array<{
 *       id?: number,
 *       startDate?: string,
 *       endDate?: string | null,
 *       city?: string,
 *       title?: string,
 *       status?: string,
 *       registerLink?: object | null,
 *     }>,
 *   },
 *   baseUrl?: string,
 * }} props
 */
export default function CourseCards({data, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const origin = useRouteLoaderData('root')?.siteOrigin;
  const {eyebrow, heading, body, emptyMessage, courses} = data ?? {};
  if (!heading) return null;

  const upcoming = upcomingCourses(courses, courseToday());

  /*
   * The upcoming sessions as Event structured data. Only sessions with a
   * Title — it's the event's name, and the city alone isn't one.
   */
  const eventsJsonLd = origin
    ? coursesJsonLd({
        origin,
        courses: upcoming
          .filter((c) => c.title?.trim())
          .map((c) => ({
            name: c.title.trim(),
            startDate: c.startDate,
            endDate: c.endDate,
            city: c.city,
            url: absoluteUrl(linkDestination(c.registerLink), origin),
            soldOut: /sold\s*out|full/i.test(c.status ?? ''),
          })),
      })
    : null;
  const backgroundUrl = strapiMedia(data.backgroundImage?.url, baseUrl);

  return (
    <section {...trackingRoot} className={styles.section}>
      <JsonLd data={eventsJsonLd} />
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          /* Decorative — the copy carries the meaning. */
          alt=""
          className={styles.backgroundImage}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.inner}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-reveal style={{'--reveal-i': 0}}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={styles.heading} data-reveal style={{'--reveal-i': 1}}>
          <RaisedMarks text={heading} />
        </h2>
        {body ? (
          <p className={styles.body} data-reveal style={{'--reveal-i': 2}}>
            {body}
          </p>
        ) : null}

        {upcoming.length > 0 ? (
          <ul className={styles.grid}>
            {upcoming.map((course, i) => (
              <CourseCard key={course.id ?? i} course={course} index={i} />
            ))}
          </ul>
        ) : (
          <p className={styles.empty} data-reveal style={{'--reveal-i': 3}}>
            {emptyMessage?.trim() || DEFAULT_EMPTY}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * @param {{course: object, index: number}} props
 */
function CourseCard({course, index}) {
  const {startDate, endDate, city, title, status, registerLink} = course;
  const dates = formatCourseDates(startDate, endDate);
  const hasLink = Boolean(linkDestination(registerLink));
  // CmsLink never opens a '#' placeholder in a new tab, so neither does the ↗.
  const opensNewTab =
    Boolean(registerLink?.openNewTab) &&
    !linkDestination(registerLink).startsWith('#');
  const label = registerLink?.linkText?.trim() || 'Register';
  // Every card's link reads the same ("Register on Cvent"), so a screen
  // reader's links list couldn't tell the sessions apart. The city and dates
  // go into the link's name, unseen.
  const session = [city?.trim(), dates].filter(Boolean).join(', ');

  return (
    <li className={styles.item} data-reveal style={{'--reveal-i': index + 3}}>
      <div className={styles.card}>
        <div className={styles.top}>
          <p className={styles.dates}>
            <CalendarIcon />
            <time dateTime={startDate}>{dates}</time>
          </p>
          {status ? <span className={styles.status}>{status}</span> : null}
        </div>

        <h3 className={styles.city}>
          <PinIcon />
          <span>{city}</span>
        </h3>

        {title ? (
          <p className={styles.title}>
            <RaisedMarks text={title} />
          </p>
        ) : null}

        {hasLink ? (
          <CmsLink
            link={registerLink}
            className={styles.link}
            trackRole={`register-${index + 1}`}
          >
            {label}
            {session ? <span className="sr-only">, {session}</span> : null}
            {/* The arrow nudges on hover, the site's arrow-link motion: ↗ for
              a new tab (Cvent), up and to the right; the orange chevron
              otherwise, to the right. CmsLink adds the "opens in a new tab"
              announcement itself. */}
            {opensNewTab ? (
              <span className={styles.arrow} aria-hidden="true">
                ↗
              </span>
            ) : (
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
            )}
          </CmsLink>
        ) : null}
      </div>
    </li>
  );
}

/* Both icons are the comp's, decorative: the text beside each says it. */

function CalendarIcon() {
  return (
    <svg
      className={styles.calendar}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className={styles.pin}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  );
}
