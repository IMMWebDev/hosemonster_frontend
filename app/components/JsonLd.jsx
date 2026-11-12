import {jsonLdHtml} from '~/lib/seo';

/**
 * A JSON-LD block. A data block, never executed, so it needs no CSP nonce.
 * Renders nothing for null, so callers can pass a builder's result straight
 * in.
 *
 * @param {{data: unknown}} props
 */
export function JsonLd({data}) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: jsonLdHtml(data)}}
    />
  );
}
