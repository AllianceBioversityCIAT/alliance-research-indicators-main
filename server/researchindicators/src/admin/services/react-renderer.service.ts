import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ReactRendererService {
  private manifest: any;
  private isDevelopment = process.env.NODE_ENV !== 'production';

  constructor() {
    // Always try to load the manifest if it exists
    // This allows us to use built assets even in development
    try {
      const manifestPath = join(
        process.cwd(),
        'dist/admin/public/.vite/manifest.json',
      );
      this.manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      console.log('Vite manifest loaded successfully');
    } catch (error) {
      console.error('Error loading Vite manifest:', error);
      console.warn('Vite manifest not found. Run: npm run build:admin');
      console.warn(
        'Falling back to development mode (Vite dev server on port 5173)',
      );
    }
  }

  /**
   * Render React component to HTML with SSR
   */
  async render(url: string, initialData: any): Promise<string> {
    try {
      // Import the server entry point
      const serverEntry = await import('../client/entry-server');
      const appHtml = serverEntry.render(url, initialData);

      // Generate the full HTML document
      return this.createHtmlDocument(appHtml, initialData);
    } catch (error) {
      console.error('SSR Error:', error);
      // Fallback to client-side rendering
      return this.createHtmlDocument('', initialData);
    }
  }

  /**
   * Create complete HTML document with scripts and styles
   */
  private createHtmlDocument(appHtml: string, initialData: any): string {
    // Use built assets if manifest is available, otherwise fall back to dev mode
    const useBuiltAssets = !!this.manifest;
    const scriptTags = useBuiltAssets
      ? this.getProdScripts()
      : this.getDevScripts();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Research Indicators</title>

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    ${useBuiltAssets ? this.getProdStyles() : ''}
</head>
<body>
    <div id="root">${appHtml}</div>

    <!-- Initial data for hydration -->
    <script>
        window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
    </script>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <!-- React App Scripts -->
    ${scriptTags}
</body>
</html>
    `.trim();
  }

  /**
   * Get development scripts (Vite dev server)
   */
  private getDevScripts(): string {
    return `
    <script type="module">
        import RefreshRuntime from 'http://localhost:5173/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>
    <script type="module" src="http://localhost:5173/src/admin/client/entry-client.tsx"></script>
    `;
  }

  /**
   * Get production scripts (built assets)
   */
  private getProdScripts(): string {
    if (!this.manifest) return '';

    const entry = this.manifest['src/admin/client/entry-client.tsx'];
    if (!entry) return '';

    return `
    <script type="module" src="/admin/public/${entry.file}"></script>
    `;
  }

  /**
   * Get production styles
   */
  private getProdStyles(): string {
    if (!this.manifest) return '';

    const entry = this.manifest['src/admin/client/entry-client.tsx'];
    if (!entry?.css) return '';

    return entry.css
      .map(
        (css: string) => `<link rel="stylesheet" href="/admin/public/${css}">`,
      )
      .join('\n    ');
  }
}
