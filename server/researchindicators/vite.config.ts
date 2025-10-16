import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
  build: {
    outDir: 'dist/admin/public',
    manifest: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/admin/client/entry-client.tsx'),
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@admin': resolve(__dirname, 'src/admin/client'),
    },
  },
  ssr: {
    noExternal: ['react', 'react-dom', 'react-router-dom'],
  },
});
