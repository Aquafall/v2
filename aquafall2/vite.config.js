import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: "./",
  server: {
    allowedHosts: [
      "aud.is-a.dev",
      "vitedev.logangamesdaily.co.uk",
    ],
    hmr: {
      overlay: true, // set to false if you want to disable the red error overlay
    },
  },
});
