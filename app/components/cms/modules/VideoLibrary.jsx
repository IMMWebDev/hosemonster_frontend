import {useId, useRef} from 'react';
import {Link, useSearchParams} from 'react-router';
import RaisedMarks from '~/components/cms/RaisedMarks';
import VideoCard from '~/components/cms/video/VideoCard';
import {useVideoPlayer} from '~/components/cms/video/VideoPlayer';
import {useTrackId, useTrackingRoot} from '~/lib/tracking';
import {JsonLd} from '~/components/JsonLd';
import {
  VIDEO_EQUIPMENT_PARAM,
  VIDEO_SECTION_PARAM,
  VIDEOS_PER_SECTION,
  videoCardsJsonLd,
} from '~/lib/videos';
import styles from './VideoLibrary.module.css';

const ALL = 'all';

/**
 * Video Library module — sprint-05 hifi_hmuvideos.html, the filters and the
 * video groups.
 *
 * Every published video, grouped under its Section, with a Section and an
 * Equipment filter. Nothing is picked in the
 * module: the route loader fetches the whole library (lib/videos.js
 * getModuleVideos) and hands it down as `videoLibrary`.
 *
 * The filters live in the URL (?section=pitotless-nozzle&equipment=…), so
 * Back undoes one, a filtered view can be shared, and other pages can link
 * straight to a section. They're still applied in the browser — the whole
 * library is already on the page, and the routes skip re-running their
 * loader when only these change (lib/videos onlyVideoFiltersChanged) — so a
 * change is instant. Equipment matches a video's Tag. An unknown value in
 * the URL is ignored (treated as All). A section with nothing left under the
 * filters drops out; with nothing left at all, a line says so with a way
 * back.
 *
 * Built to grow: on the "All" view each section shows its first
 * VIDEOS_PER_SECTION videos (two rows at four across) and a "View all N
 * videos" link, which is simply that section's filter — so a big library
 * stays a scannable overview, and drilling in uses the filter people already
 * have.
 *
 * Each card plays its video in the pop-up player.
 *
 * @param {{
 *   data: {heading?: string},
 *   videoLibrary?: {
 *     sections: Array<{key: string, name: string, slug: string, description?: string, videos: Array<object>}>,
 *     tags: Array<{name: string, slug: string}>,
 *     total: number,
 *   } | null,
 *   baseUrl?: string,
 * }} props
 */
export default function VideoLibrary({data, videoLibrary, baseUrl}) {
  const trackingRoot = useTrackingRoot();
  const trackId = useTrackId();
  const player = useVideoPlayer();
  const sectionId = useId();
  const tagId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionRef = useRef(/** @type {HTMLSelectElement | null} */ (null));
  const filtersRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  if (!videoLibrary || videoLibrary.total === 0) return null;
  const {sections, tags, total} = videoLibrary;
  const heading = data?.heading?.trim();

  // The filters, read from the URL; anything that isn't a real option is All.
  const wantedSection = searchParams.get(VIDEO_SECTION_PARAM);
  const wantedTag = searchParams.get(VIDEO_EQUIPMENT_PARAM);
  const section = sections.some((s) => s.slug === wantedSection)
    ? wantedSection
    : ALL;
  const tag = tags.some((t) => t.slug === wantedTag) ? wantedTag : ALL;

  /** The search string for a pair of filter values, other params kept. */
  const searchFor = (nextSection, nextTag) => {
    const params = new URLSearchParams(searchParams);
    if (nextSection === ALL) params.delete(VIDEO_SECTION_PARAM);
    else params.set(VIDEO_SECTION_PARAM, nextSection);
    if (nextTag === ALL) params.delete(VIDEO_EQUIPMENT_PARAM);
    else params.set(VIDEO_EQUIPMENT_PARAM, nextTag);
    const query = params.toString();
    return query ? `?${query}` : '';
  };

  // A new history entry per change, so Back undoes it; the page stays put.
  const applyFilters = (nextSection, nextTag) =>
    setSearchParams(new URLSearchParams(searchFor(nextSection, nextTag)), {
      preventScrollReset: true,
    });

  // On the "All" view each section is capped; a picked section shows all.
  const limit = section === ALL ? VIDEOS_PER_SECTION : Infinity;

  const groups = sections
    .filter((s) => section === ALL || s.slug === section)
    .map((s) => {
      const matching = s.videos.filter(
        (v) => tag === ALL || v.tag?.slug === tag,
      );
      return {...s, matching, videos: matching.slice(0, limit)};
    })
    .filter((s) => s.matching.length > 0);
  const shown = groups.reduce((n, g) => n + g.videos.length, 0);
  // Everything the filters match, including videos behind a "View all".
  const matched = groups.reduce((n, g) => n + g.matching.length, 0);
  const filtered = section !== ALL || tag !== ALL;

  /*
   * "View all" swaps a long page for a short one, which would leave the
   * reader scrolled past its end. Bring the filters into view instead, so
   * they land on the section with its filter showing.
   */
  const toFilters = () => {
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    // Straight away, in the click: the filters sit above the groups, so the
    // shorter page that follows doesn't move them.
    filtersRef.current?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
    // The link goes away with the switch, so focus follows the page up to
    // the Section filter, as Clear filters does. preventScroll leaves the
    // smooth scroll above in charge.
    sectionRef.current?.focus({preventScroll: true});
  };

  // Group names are h2s on a page of their own, h3s under a module heading.
  const GroupHeading = heading ? 'h3' : 'h2';
  let cardNumber = 0;

  return (
    <section {...trackingRoot} className={styles.section}>
      {/* Every video in the library, whatever the filters show. */}
      <JsonLd
        data={videoCardsJsonLd(
          sections.flatMap((s) => s.videos),
          baseUrl,
        )}
      />
      <div className={styles.inner}>
        {heading ? (
          <h2 className={styles.heading}>
            <RaisedMarks text={heading} />
          </h2>
        ) : null}

        <div ref={filtersRef} className={styles.filters}>
          <div className={styles.filter}>
            <label className={styles.label} htmlFor={sectionId}>
              Section
            </label>
            <select
              ref={sectionRef}
              id={sectionId}
              className={styles.select}
              value={section}
              onChange={(e) => applyFilters(e.target.value, tag)}
              data-track-id={trackId('filter-section')}
            >
              <option value={ALL}>All</option>
              {sections.map((s) => (
                <option key={s.key} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {tags.length > 0 ? (
            <div className={styles.filter}>
              <label className={styles.label} htmlFor={tagId}>
                Equipment
              </label>
              <select
                id={tagId}
                className={styles.select}
                value={tag}
                onChange={(e) => applyFilters(section, e.target.value)}
                data-track-id={trackId('filter-equipment')}
              >
                <option value={ALL}>All</option>
                {tags.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/*
            With a filter on (and something found): how many videos it
            found, and one click back to everything. Off by default — each
            section already says how many it holds. A link, so it works
            before the page's script loads; the line goes away once used,
            so focus moves to the first filter rather than dropping to the
            page.
          */}
          {filtered && matched > 0 ? (
            <p className={styles.result}>
              {matched} {matched === 1 ? 'video' : 'videos'}
              <span aria-hidden="true"> · </span>
              <Link
                to={{search: searchFor(ALL, ALL)}}
                preventScrollReset
                className={styles.clear}
                onClick={() => sectionRef.current?.focus()}
                data-track-id={trackId('filter-clear')}
              >
                Clear filters
              </Link>
            </p>
          ) : null}

          {/* A screen reader hears what each filter change did. */}
          <p className="sr-only" aria-live="polite">
            {shown} of {total} videos shown
          </p>
        </div>

        {groups.length > 0 ? (
          <div className={styles.groups}>
            {groups.map((group) => (
              <div key={group.key} className={styles.group}>
                <GroupHeading className={styles.groupTitle}>
                  <RaisedMarks text={group.name} />
                </GroupHeading>
                <div className={styles.groupMeta}>
                  {group.description ? (
                    <p className={styles.groupDescription}>
                      {group.description}
                    </p>
                  ) : null}
                  <span className={styles.groupCount}>
                    · {group.matching.length}{' '}
                    {group.matching.length === 1 ? 'video' : 'videos'}
                  </span>
                </div>
                <ul className={styles.grid}>
                  {group.videos.map((video) => {
                    cardNumber += 1;
                    return (
                      <li
                        key={video.documentId ?? video.id}
                        className={styles.item}
                      >
                        <VideoCard
                          video={video}
                          onPlay={player.open}
                          trackRole={`video-${video.slug || cardNumber}`}
                          baseUrl={baseUrl}
                          showTag
                          showDuration
                        />
                      </li>
                    );
                  })}
                </ul>
                {group.matching.length > group.videos.length ? (
                  <Link
                    to={{search: searchFor(group.slug, tag)}}
                    preventScrollReset
                    className={styles.viewAll}
                    onClick={toFilters}
                    data-track-id={trackId(`view-all-${group.slug}`)}
                  >
                    View all {group.matching.length} videos
                    <span className="sr-only"> in {group.name}</span>
                    <svg
                      className={styles.viewAllIcon}
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
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No videos match those filters.</p>
            <button
              type="button"
              className={styles.reset}
              onClick={() => {
                applyFilters(ALL, ALL);
                // This button disappears with the empty state; focus goes to
                // the first filter rather than dropping to the page.
                sectionRef.current?.focus();
              }}
              data-track-id={trackId('filter-reset')}
            >
              Show all videos
            </button>
          </div>
        )}
      </div>
      {player.dialog}
    </section>
  );
}
