import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
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
if (!import.meta.env.VITE_SINGLE_FILE) registerSW({ immediate: true });

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
