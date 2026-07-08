import {Link} from 'react-router';

/**
 * CMS-driven 404 content from the Strapi `page-not-found` single type.
 * Currently renders `header` + optional `description`. Extend as you add fields
 * — e.g. if you give `page-not-found` a dynamic zone later, render it here with
 * <BlockManager blocks={data.modules} />.
 *
 * @param {{data?: {header?: string, description?: string} | null}} props
 */
export default function NotFound({data}) {
  return (
    <div className="cms-not-found">
      <h1>{data?.header ?? 'Page not found'}</h1>
      {data?.description ? <p>{data.description}</p> : null}
      <Link to="/" className="cms-button cms-button--primary">
        Go to homepage
      </Link>
    </div>
  );
}
