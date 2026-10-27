import { useEffect, useRef, useState } from "react";
import { MODES, MODE_BY_ID, type ModeId } from "../data/modes";
import { categoryStyle } from "../lib/style";
import { useTheme } from "../state/theme";
import { BoardBody, GameScreen, PromptBody, SecretBody } from "../components/GameScreen";
import { HoldButton, useHoldReveal } from "../components/HoldButton";
import { RankRows } from "../components/RankRows";
import { Choices } from "../components/Choices";
import { DeckTile } from "../components/DeckTile";
import { SeatStrip } from "../components/SeatStrip";
import { UpNext } from "../components/UpNext";
import { SidePanel } from "../components/SidePanel";
import { PromptCard } from "../components/PromptCard";
import { PlayingCard } from "../components/PlayingCard";
import { shuffled } from "../lib/dragOrder";
import type { HoldState } from "../lib/holdReveal";
import "./lab.css";

/**
 * THE LAB. Dev only — main.tsx mounts it for `?lab` under `npm run dev`, and a
 * production build never contains it.
 *
 * Every new landscape piece, alone, in every state it can be in, on any
 * pack's colour and in either theme. Placeholder content throughout: nothing
 * here is a game, and no game imports anything from here.
 */

type Page = "pieces" | "prompt" | "board" | "secret";

const PAGES: { id: Page; label: string }[] = [
  { id: "pieces", label: "Pieces" },
  { id: "prompt", label: "Prompt" },
  { id: "board", label: "Board" },
  { id: "secret", label: "Secret" },
];

const SEATS = ["Maya", "Sam", "Jo", "Priya", "Dev"];
const ITEMS = ["Drinks at a bar", "Dinner somewhere nice", "Mini golf", "A long walk", "The cinema"];
const noHandlers = {
  onPointerDown: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
  onPointerLeave: () => {},
};

export function Lab() {
  const [page, setPage] = useState<Page>(() => (location.hash.slice(1) as Page) || "pieces");
  const [modeId, setModeId] = useState<ModeId>("rank-it");
  const { theme, setPreference } = useTheme();
  const mode = MODE_BY_ID[modeId];

  useEffect(() => {
    history.replaceState(null, "", `?lab#${page}`);
  }, [page]);

  const bar = (
    <nav className="lab-bar" aria-label="Lab">
      {PAGES.map((p) => (
        <button key={p.id} className="lab-bar__tab" data-on={p.id === page || undefined} onClick={() => setPage(p.id)}>
          {p.label}
        </button>
      ))}
      <select className="lab-bar__pick" value={modeId} onChange={(e) => setModeId(e.target.value as ModeId)} aria-label="Pack colour">
        {MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <button className="lab-bar__tab" onClick={() => setPreference(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? "Light" : "Dark"}
      </button>
    </nav>
  );

  return (
    <div className="app" style={categoryStyle(mode.color)}>
      {bar}
      <div className="app__frame">
        {page === "pieces" && <Pieces />}
        {page === "prompt" && <PromptShell modeId={modeId} onBack={() => setPage("pieces")} />}
        {page === "board" && <BoardShell modeId={modeId} onBack={() => setPage("pieces")} />}
        {page === "secret" && <SecretShell modeId={modeId} onBack={() => setPage("pieces")} />}
      </div>
    </div>
  );
}

/* ---------------- Pieces ---------------- */

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="lab-section">
      <h2 className="lab-section__title">{title}</h2>
      {note && <p className="lab-section__note">{note}</p>}
      {children}
    </section>
  );
}

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="lab-state">
      {children}
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function Pieces() {
  const [panel, setPanel] = useState(false);
  return (
    <div className="screen lab-pieces">
      <h1 className="lab-title">Landscape pieces</h1>

      <Section title="Hold to reveal" note="Hold the live one. Space works too. Let go, slide off, or let the page hide.">
        <div className="lab-row">
          <LiveHold />
          <State label="Idle">
            <HoldButton handlers={noHandlers} state={{ phase: "idle" }} />
          </State>
          <State label="Pressed — on the private screen, where it only ever is">
            <div className="lab-dark">
              <HoldButton handlers={noHandlers} state={{ phase: "holding", source: "pointer", pointerId: 1 }} heldLabel="Let go to hide" />
            </div>
          </State>
          <State label="Released">
            <HoldButton handlers={noHandlers} state={{ phase: "released", reason: "let-go" }} />
          </State>
          <State label="Hidden by useWhenHidden">
            <HoldButton handlers={noHandlers} state={{ phase: "released", reason: "hidden" }} />
          </State>
        </div>
      </Section>

      <Section title="Rank It rows" note="Drag a row or its grip. Tab to a row and use the arrow keys.">
        <div className="lab-grid">
          <LiveRows />
          <State label="Mid-drag">
            <div className="lab-listcard">
              <RankRows items={ITEMS} still={{ drag: { index: 1, dy: 96 } }} />
            </div>
          </State>
          <State label="Keyboard focus">
            <div className="lab-listcard">
              <RankRows items={ITEMS} still={{ focus: 2 }} />
            </div>
          </State>
          <State label="Reveal">
            <div className="lab-listcard">
              <RankRows items={ITEMS} guess={[ITEMS[0], ITEMS[3], ITEMS[2], ITEMS[1], ITEMS[4]]} />
            </div>
          </State>
        </div>
      </Section>

      <Section title="Bottom choice row">
        <State label="Two">
          <Choices label="Red or black">
            <button className="btn btn--lg">Red</button>
            <button className="btn btn--lg">Black</button>
          </Choices>
        </State>
        <State label="Four">
          <Choices label="Suit">
            {["Hearts", "Diamonds", "Clubs", "Spades"].map((s) => (
              <button key={s} className="btn btn--lg">
                {s}
              </button>
            ))}
          </Choices>
        </State>
      </Section>

      <Section title="Home grid tile" note="Four across on a board, three in portrait, two on a phone.">
        <div className="deck-grid">
          {MODES.map((m) => (
            <DeckTile key={m.id} mode={m} onOpen={() => {}} />
          ))}
        </div>
      </Section>

      <Section title="Seat strip and Up next">
        <div className="lab-row">
          <State label="First seat">
            <SeatStrip seats={SEATS} current={0} label="Reveal 1 of 5" />
          </State>
          <State label="Second seat">
            <SeatStrip seats={SEATS} current={1} label="Reveal 2 of 5" />
          </State>
          <State label="Up next">
            <UpNext name="Sam" />
          </State>
        </div>
      </Section>

      <Section title="Side panel" note="Settings and the roster. A sheet off a board.">
        <button className="btn" onClick={() => setPanel(true)}>
          Open panel
        </button>
      </Section>
      {panel && (
        <SidePanel title="Settings" closeLabel="Close settings" onClose={() => setPanel(false)}>
          {["Content", "Appearance", "Sound", "Keep screen awake"].map((name) => (
            <section key={name} className="setting">
              <div className="setting__label">
                <span className="setting__name">{name}</span>
                <span className="setting__hint">Placeholder row.</span>
              </div>
              <div className="segmented" role="radiogroup" aria-label={name} style={{ ["--n" as string]: 2, ["--i" as string]: 0 }}>
                <button className="segmented__opt" data-on role="radio" aria-checked>
                  on
                </button>
                <button className="segmented__opt" role="radio" aria-checked={false}>
                  off
                </button>
              </div>
            </section>
          ))}
        </SidePanel>
      )}
    </div>
  );
}

function LiveHold() {
  const [log, setLog] = useState("Not held yet");
  const [hideSoon, setHideSoon] = useState(false);
  const hold = useHoldReveal(true, (reason) => setLog(reason === "hidden" ? "Hidden by the page" : "Let go"));
  const timer = useRef<number>(undefined);

  // Hold it with this on and the page "hides" two seconds in — the path
  // useWhenHidden takes when the screen locks.
  useEffect(() => {
    if (!hideSoon || !hold.showing) return;
    timer.current = window.setTimeout(hold.hide, 2000);
    return () => window.clearTimeout(timer.current);
  }, [hideSoon, hold.showing, hold.hide]);

  return (
    <State label={hold.showing ? "Held — the secret is showing" : log}>
      <HoldButton handlers={hold.handlers} state={hold.state} />
      <label className="lab-check">
        <input type="checkbox" checked={hideSoon} onChange={(e) => setHideSoon(e.target.checked)} /> Hide the page 2s into a hold
      </label>
    </State>
  );
}

function LiveRows() {
  const [items, setItems] = useState(() => shuffled(ITEMS));
  return (
    <State label="Resting — live">
      <div className="lab-listcard">
        <RankRows items={items} onReorder={setItems} />
      </div>
    </State>
  );
}

/* ---------------- Shells ---------------- */

function PromptShell({ modeId, onBack }: { modeId: ModeId; onBack: () => void }) {
  return (
    <GameScreen mode={MODE_BY_ID[modeId]} layout="prompt" onBack={onBack}>
      <PromptBody
        card={
          <PromptCard eyebrow="Confession" dealKey={1}>
            Admit the last time you texted someone you shouldn't have.
          </PromptCard>
        }
        rail={
          <>
            <span className="lab-live">Warming up</span>
            <span className="lab-meta">Card 1 of 45</span>
            <UpNext name="Sam" />
          </>
        }
      >
        <div className="actions">
          <button className="btn btn--lg btn--block">Next player</button>
          <button className="btn btn--ghost btn--block">Skip to getting personal</button>
        </div>
      </PromptBody>
    </GameScreen>
  );
}

function BoardShell({ modeId, onBack }: { modeId: ModeId; onBack: () => void }) {
  return (
    <GameScreen mode={MODE_BY_ID[modeId]} layout="board" subtitle="Red or black?" onBack={onBack}>
      <BoardBody
        stage={
          <div className="rtb__felt lab-felt">
            {[0, 1, 2, 3].map((i) => (
              <PlayingCard key={i} card={null} placeholder />
            ))}
          </div>
        }
        rule="Wrong costs 1 this round, then 2, 3 and 4."
        choices={
          <Choices label="Red or black">
            <button className="btn btn--lg">Red</button>
            <button className="btn btn--lg">Black</button>
          </Choices>
        }
      />
    </GameScreen>
  );
}

function SecretShell({ modeId, onBack }: { modeId: ModeId; onBack: () => void }) {
  const [seat, setSeat] = useState(1);
  const [pinned, setPinned] = useState(false);
  const hold = useHoldReveal(true, (reason) => {
    if (reason === "let-go") setSeat((s) => (s + 1) % SEATS.length);
    hold.reset();
  });
  const holding = pinned || hold.showing;
  const name = SEATS[seat];
  const next = SEATS[(seat + 1) % SEATS.length];
  const state: HoldState = pinned ? { phase: "holding", source: "pointer", pointerId: 0 } : hold.state;

  return (
    <GameScreen mode={MODE_BY_ID[modeId]} layout="secret" hideHeader={holding} onBack={onBack}>
      {holding ? (
        <SecretBody
          holding
          top={
            <>
              <span>Odd One Out · Reveal {seat + 1} of 5</span>
              <span>Only {name} is looking</span>
            </>
          }
          side={<HoldButton handlers={hold.handlers} state={state} heldLabel="Let go to hide" />}
          foot={
            <span>
              When you let go, {next} is up next
              {pinned && (
                <>
                  {" · "}
                  <button className="lab-link" onClick={() => setPinned(false)}>
                    unpin
                  </button>
                </>
              )}
            </span>
          }
        >
          <div className="lab-rolecard">
            <article className="card">
              <span className="card__eyebrow">The word is</span>
              <p className="card__prompt">Box of their stuff</p>
              <p className="card__meta">One clue each. Don't make it obvious.</p>
            </article>
          </div>
        </SecretBody>
      ) : (
        <SecretBody
          top={<SeatStrip seats={SEATS} current={seat} label={`Reveal ${seat + 1} of 5`} />}
          side={<HoldButton handlers={hold.handlers} state={state} />}
          foot={
            <>
              <button className="btn btn--ghost">Start over</button>
              <button className="lab-link" onClick={() => setPinned(true)}>
                Pin the held state
              </button>
              <span className="lab-meta">Rather keep it in your hands? Pass the iPad to {name}.</span>
            </>
          }
        >
          <h2 className="lab-name">{name}, you're up</h2>
          <p className="lab-hint">Everyone else, look away. {name}: hold the button to see your role. Let go and it's gone.</p>
        </SecretBody>
      )}
    </GameScreen>
  );
}
