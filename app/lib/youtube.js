/**
 * Pulls the video ID out of whatever YouTube URL an editor pasted.
 *
 * Editors copy from wherever they happen to be — the address bar, the Share
 * button, or the embed snippet — so all of these have to work rather than
 * asking them to hand-craft one shape:
 *
 *   https://youtu.be/D1UwgRe75gc?si=r-iqAEulMA6qbPhN
 *   https://www.youtube.com/watch?v=D1UwgRe75gc&t=42s
 *   https://www.youtube.com/embed/D1UwgRe75gc
 *   https://www.youtube.com/shorts/D1UwgRe75gc
 *   https://www.youtube.com/live/D1UwgRe75gc
 *   D1UwgRe75gc
 *
 * Tracking params (`?si=`, `&t=`, playlist ids) are dropped — the ID is all the
 * embed needs, and passing the rest through would leak referrer data we control
 * separately via youtube-nocookie.
 *
 * @param {string} [url]
 * @returns {string | null} the 11-character video ID, or null if none is found
 */
export function youTubeId(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // A bare ID pasted on its own. YouTube IDs are exactly 11 chars from a
  // known alphabet, which is what makes this safe to detect.
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /youtu\.be\/([\w-]{11})/, // short share link
    /[?&]v=([\w-]{11})/, // watch?v=
    /\/embed\/([\w-]{11})/, // already an embed URL
    /\/shorts\/([\w-]{11})/,
    /\/live\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Player URL for the click-to-play iframe.
 *
 * youtube-nocookie.com rather than youtube.com: it does not set tracking
 * cookies until the viewer actually plays something, which keeps a page that
 * merely *contains* a video out of consent-banner territory.
 *
 * `autoplay=1` is correct here — the iframe is only ever mounted by a click, so
 * playback is user-initiated, not an autoplaying page element.
 *
 * @param {string} id
 * @returns {string}
 */
export function youTubeEmbedUrl(id) {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0', // keep "related videos" to this channel
    modestbranding: '1',
    playsinline: '1', // iOS: play inline instead of hijacking fullscreen
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/**
 * Poster frame served by YouTube, used when the CMS has no image of its own.
 *
 * `hqdefault` rather than `maxresdefault`: maxres does not exist for every
 * video and 404s to a broken image when it is missing, whereas hqdefault is
 * always generated.
 *
 * @param {string} id
 * @returns {string}
 */
export function youTubeThumbnail(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
