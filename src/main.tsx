import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { captureRegistration } from "./lib/swUpdate";
import App from "./App";
import { ContentModeProvider } from "./state/contentMode";
import { DialStyleProvider } from "./state/dialStyle";
import { RosterProvider } from "./state/roster";
import { ThemeProvider } from "./state/theme";
import "./styles/global.css";

// Offline is a hard requirement, not a nicety — the app has to work in a
// basement bar with no signal. Auto-update so a returning user quietly
// picks up new content on their next launch.
// Skipped in single-file preview builds, which have no service worker to fetch.
//
// The registration is handed to lib/swUpdate so Settings' Updates control can
// ask for a new build on demand — the one thing autoUpdate cannot do for
// itself, because iOS only looks for a new worker on a cold launch. Both
// callbacks report, and so does the skipped branch: for that control,
// "there will never be a worker" is an answer, and the alternative is a
// promise that stays pending and a button that waits on it.
if (import.meta.env.VITE_SINGLE_FILE) {
  captureRegistration(undefined);
} else {
  registerSW({
    immediate: true,
    onRegisteredSW: (_swScriptUrl, registration) => captureRegistration(registration),
    onRegisterError: () => captureRegistration(undefined),
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ContentModeProvider>
        <RosterProvider>
          <DialStyleProvider>
            <App />
          </DialStyleProvider>
        </RosterProvider>
      </ContentModeProvider>
    </ThemeProvider>
  </StrictMode>,
);
