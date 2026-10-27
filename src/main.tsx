import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { captureApply, captureRegistration, markReady } from "./lib/swUpdate";
import App from "./App";
import { ContentModeProvider } from "./state/contentMode";
import { RosterProvider } from "./state/roster";
import { ThemeProvider } from "./state/theme";
import "./styles/global.css";

// Offline is a hard requirement, not a nicety — the app has to work in a
// basement bar with no signal. Updates are found automatically but APPLIED on
// the app's terms: a new build waits, and lib/swUpdate decides when it may
// take over — at once on a cold launch, by offer at Home, never mid-round.
// Skipped in single-file preview builds, which have no service worker to fetch;
// the store is told so, so Settings can say "not available" instead of waiting.
if (import.meta.env.VITE_SINGLE_FILE) {
  captureRegistration(undefined);
} else {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: markReady,
    onRegisteredSW: (_url, registration) => captureRegistration(registration),
    onRegisterError: () => captureRegistration(undefined),
  });
  captureApply(() => updateSW(true));
}

/**
 * THE LAB, under `npm run dev` with `?lab` in the address — every new
 * landscape piece alone, in every state. See src/lab/Lab.tsx.
 *
 * `import.meta.env.DEV` is a constant the build replaces with `false`, so in
 * production this branch and the dynamic import inside it are removed
 * entirely: the lab is not hidden from a production build, it is not in one.
 */
const screen: Promise<() => React.JSX.Element> =
  import.meta.env.DEV && new URLSearchParams(location.search).has("lab")
    ? import("./lab/Lab").then((m) => m.Lab)
    : Promise.resolve(App);

void screen.then((Screen) =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <ContentModeProvider>
          <RosterProvider>
            <Screen />
          </RosterProvider>
        </ContentModeProvider>
      </ThemeProvider>
    </StrictMode>,
  ),
);
