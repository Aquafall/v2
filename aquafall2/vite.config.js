import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path, { resolve } from "path";

export default defineConfig({plugins: [
    svelte(),
    {
      name: "inject-source-path",
      transform(code, id) {
        return code.replace(/__SOURCE__/g, JSON.stringify(id));
      },
    },
  ],
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
  resolve: {
    alias: {
      $assets: resolve(__dirname, "./src/assets"),
      $state: resolve(__dirname, "./src/state"),
      $apps: resolve(__dirname, "./src/apps"),
      $css: resolve(__dirname, "./src/css"),
      $types: resolve(__dirname, "./src/types"),
      $ts: resolve(__dirname, "./src/ts"),
      $lib: resolve(__dirname, "./src/lib"),
      $interfaces: resolve(__dirname, "./src/interfaces"),
    },
  },
});
