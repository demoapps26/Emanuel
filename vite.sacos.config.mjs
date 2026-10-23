import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'dist-sacos', assetsInlineLimit: Infinity, rollupOptions: { input: 'sacos-entry.html', output: { inlineDynamicImports: true } } } });
