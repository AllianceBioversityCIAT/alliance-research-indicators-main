import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';

export function render(url: string, initialData: any) {
  const html = renderToString(
    <StaticRouter location={url}>
      <App initialData={initialData} />
    </StaticRouter>
  );

  return html;
}
