import {MODULE_REGISTRY} from '~/components/cms/registry';

/**
 * Renders a Strapi dynamic zone — ported from nextjs-sample/utils/blockManager.js.
 *
 * Maps each block's `__component` to its registered component and renders it
 * with the rest of the module object as `data`. Unknown modules are logged and
 * skipped rather than crashing the page.
 *
 * @param {{
 *   blocks?: Array<{__component: string} & Record<string, any>>,
 *   baseUrl?: string
 * }} props
 */
export default function BlockManager({blocks, baseUrl}) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <>
      {blocks.map(({__component, ...rest}, index) => {
        const entry = MODULE_REGISTRY[__component];
        if (!entry) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[CMS] Unknown module "${__component}" — skipped.`);
          }
          return null;
        }
        const {Component} = entry;
        return (
          <Component
            key={`block-${__component}-${index}`}
            data={rest}
            baseUrl={baseUrl}
          />
        );
      })}
    </>
  );
}
