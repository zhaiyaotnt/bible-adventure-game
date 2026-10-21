import { defineConfig } from 'vite';
// Relative URLs work at both a domain root and any GitHub Pages repository path.
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 1600 } });
