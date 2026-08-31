import {useEffect, useLayoutEffect} from 'react';

/**
 * useLayoutEffect cannot run on the server, and Hydrogen server-renders every
 * component — React warns loudly about it on every render. Falling back to
 * useEffect on the server keeps the client behaviour (measure before paint, so
 * a corrected layout never flashes) without the warning.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
