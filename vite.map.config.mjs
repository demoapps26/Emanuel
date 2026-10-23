import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-mapa',
    assetsInlineLimit: Infinity,
    rollupOptions: { input: 'mapa-entry.html', output: { inlineDynamicImports: true } },
  },
});
