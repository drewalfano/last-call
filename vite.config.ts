import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Deploy target decides the base path:
 *   - user/org page (username.github.io) or a custom domain → "/" (default)
 *   - project page (username.github.io/last-call/)          → "/last-call/"
 *
 * The GitHub Actions workflow sets VITE_BASE automatically from the repo
 * name, so neither case needs a hand edit. It has to flow through to the
 * manifest's start_url/scope as well: a service worker can only control the
 * path it is served from, so a mismatch here silently breaks installation
 * and offline support.
 */
const base = process.env.VITE_BASE ?? "/";

/**
 * VITE_SINGLE_FILE marks a standalone-preview build. The PWA plugin stays on
 * (its virtual module has to resolve either way) but main.tsx skips the
 * service-worker registration, and the inliner strips the manifest link — so
 * the resulting page has no external references at all.
 */

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Offline is a hard requirement: the app has to open and play in a
      // basement bar with no signal, so every build asset is precached.
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Last Call",
        short_name: "Last Call",
        description: "Ten pass-the-phone party games. No wifi, no accounts, no setup.",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#141414",
        theme_color: "#141414",
        categories: ["games", "entertainment"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
