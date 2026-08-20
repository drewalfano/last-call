import { execSync } from "node:child_process";
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
 * WHAT BUILD AM I LOOKING AT.
 *
 * Both halves are read at BUILD time and baked into the bundle, which is the
 * only thing that makes them worth showing. The question they answer is not
 * "what did we ship" — it is "is this phone running it". An installed app
 * precaches every asset so it opens in a bar with no signal, and iOS only
 * checks for a new service worker on a cold launch, so a home screen icon can
 * happily serve a build from days ago. A stamp baked into that same stale
 * bundle is stale with it, and says so.
 *
 * DATED, NOT NUMBERED. A semver like 1.5.0 is a promise about compatibility
 * made to people integrating against you, and there is nobody on the other
 * end of that promise here: this ships to one phone, continuously, on every
 * push to main. What it would actually be is a number somebody has to
 * remember to bump — and the one time it got forgotten it would state the
 * wrong answer confidently, which is worse than having no answer at all.
 *
 * A date needs no discipline and answers the real question on sight. "Is this
 * current" becomes "is this today", with nothing to look up and nothing to
 * remember. The commit sits beside it for the times that is not enough: it
 * pins the exact build, tells two pushes on the same day apart, and can be
 * checked against the last commit on main. GITHUB_SHA is what Actions builds
 * from, so a deployed app stamps the commit it was deployed from; the git
 * call is the local fallback and "dev" covers a tarball with no repo.
 */
const builtOn = new Date().toISOString().slice(0, 10);

const commit = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD").toString().trim();
  } catch {
    return "dev";
  }
})();

/**
 * VITE_SINGLE_FILE marks a standalone-preview build. The PWA plugin stays on
 * (its virtual module has to resolve either way) but main.tsx skips the
 * service-worker registration, and the inliner strips the manifest link — so
 * the resulting page has no external references at all.
 */

export default defineConfig({
  base,
  define: {
    __BUILT_ON__: JSON.stringify(builtOn),
    __BUILD_COMMIT__: JSON.stringify(commit),
  },
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
        description: "Eleven pass-the-phone party games. No wifi, no accounts, no setup.",
        start_url: base,
        scope: base,
        display: "standalone",
        /**
         * `any`, not `portrait`.
         *
         * The lock never did anything on the platform it was written
         * for: iOS and iPadOS do not implement the manifest's
         * `orientation` member for home-screen web apps, which is why
         * an installed iPad rotates freely today and why every
         * landscape screenshot of this app exists at all.
         *
         * Where it IS honoured — Android, desktop Chrome — it is now
         * wrong. The tablet layout is built for a device propped at an
         * angle on a table with people around it, and a board held
         * landscape is the case it is built for. Locking that to
         * portrait would be the manifest overruling the CSS.
         *
         * So this is a no-op on the target device and a fix
         * everywhere else. It also stops the manifest contradicting
         * the stylesheet, which is the kind of disagreement that
         * costs someone an afternoon later.
         */
        orientation: "any",
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
