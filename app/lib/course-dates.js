/**
 * Dates for Course Cards (module.course-cards).
 *
 * Strapi date fields come back as plain 'YYYY-MM-DD' strings with no time or
 * zone. They're read and written in UTC throughout, so a session on the 9th
 * shows as the 9th wherever the server or the visitor happens to be.
 */

const MONTH = new Intl.DateTimeFormat('en-US', {month: 'long', timeZone: 'UTC'});

/** 'YYYY-MM-DD' -> {y, m, d, month} or null. */
function parts(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  return {y, m, d, month: MONTH.format(Date.UTC(y, m - 1, d))};
}

/**
 * The session's dates the way the comp writes them:
 *   one day           September 9, 2026
 *   same month        September 9–10, 2026
 *   across months     September 30 – October 1, 2026
 *   across years      December 30, 2026 – January 1, 2027
 *
 * @param {string} start 'YYYY-MM-DD'
 * @param {string | null | undefined} end 'YYYY-MM-DD'; empty for one day
 * @returns {string}
 */
export function formatCourseDates(start, end) {
  const a = parts(start);
  if (!a) return '';
  const b = parts(end);
  if (!b || end <= start) return `${a.month} ${a.d}, ${a.y}`;
  if (a.y !== b.y) {
    return `${a.month} ${a.d}, ${a.y} – ${b.month} ${b.d}, ${b.y}`;
  }
  if (a.m !== b.m) return `${a.month} ${a.d} – ${b.month} ${b.d}, ${a.y}`;
  return `${a.month} ${a.d}–${b.d}, ${a.y}`;
}

/*
 * "Today" for deciding which sessions have passed, in US Central time — where
 * the company and most sessions are — so a course stays listed through the
 * whole of its last day in the US rather than vanishing at 7pm when UTC rolls
 * over.
 */
const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** @param {Date} [now] */
export function courseToday(now = new Date()) {
  return TODAY.format(now); // en-CA formats as YYYY-MM-DD
}

/**
 * Sessions still to come (or running today), soonest first. A session with no
 * valid start date is dropped — there's nothing to show for it.
 *
 * @template {{startDate?: string, endDate?: string | null}} T
 * @param {T[]} courses
 * @param {string} today 'YYYY-MM-DD'
 * @returns {T[]}
 */
export function upcomingCourses(courses, today) {
  return (courses ?? [])
    .filter((c) => parts(c?.startDate))
    .filter((c) => {
      const last =
        c.endDate && c.endDate > c.startDate ? c.endDate : c.startDate;
      return last.slice(0, 10) >= today;
    })
    .sort((x, y) => x.startDate.localeCompare(y.startDate));
}
