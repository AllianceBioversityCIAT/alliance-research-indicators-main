import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15
// `basename="/api"` strips the global Nest prefix so React Router can match
// `/admin/...` routes against incoming `/api/admin/...` URLs. Without it,
// the page body would be empty on every admin SSR — discovered while wiring
// the bilateral-project-mappings page.
export function render(url: string, initialData: any) {
  const html = renderToString(
    <StaticRouter location={url} basename="/api">
      <App initialData={initialData} />
    </StaticRouter>,
  );

  return html;
}
