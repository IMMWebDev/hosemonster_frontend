import {redirect} from 'react-router';

/**
 * @param {URL} requestUrl - The normalized `url` loader/action arg (v8_passThroughRequests-safe)
 * @param {...Array<{
 *     handle: string;
 *     data: {handle: string} & unknown;
 *   }>} [localizedResources]
 */
export function redirectIfHandleIsLocalized(requestUrl, ...localizedResources) {
  const url = new URL(requestUrl);
  let shouldRedirect = false;

  localizedResources.forEach(({handle, data}) => {
    if (handle !== data.handle) {
      url.pathname = url.pathname.replace(handle, data.handle);
      shouldRedirect = true;
    }
  });

  if (shouldRedirect) {
    throw redirect(url.toString());
  }
}
