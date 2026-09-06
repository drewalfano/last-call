# Last Call: choose, learn, play — a review pass (September 2026)

A product-design review of Last Call, the offline pass-the-phone party game,
carried out on 6 September 2026. The brief was to help a group choose a
suitable game, understand the first round, and play from one shared phone
without anyone becoming the permanent instructor — while keeping the stacked
coloured deck, the big type and the lightweight feel that make the app what
it is.

Everything below was observed or built in this pass. Nothing here is a
measured usability result; the session plan at the end says what would be.

## Which version is which

| | Version | Where |
|---|---|---|
| **Live app** | `origin/main` at `2d929be` (27 Aug 2026), deployed to drewalfano.github.io/last-call | "Before" screenshots |
| **Local branch `check-for-update`** | `3c0cd6e` + two weeks of uncommitted work | Preserved verbatim as commit `8fbeff3` on that branch |
| **This review** | branch `portfolio-review`, started from `origin/main` | "After" screenshots, built with `VITE_BASE=/last-call/` |

The local branch turned out to be a snapshot of an August experiment that
`main` had since absorbed and partly reverted (the dial-style switch, the
ring-order choice, and a "check for update" control that `71c9ca7` took back
out). Rather than merge stale files over the newer `main`, the uncommitted
work was committed where it sat so nothing was lost, and the review branched
from what is actually live. The update control was rebuilt here in a form
that fits the new update policy (see Phase 5).

All screenshots are from headless Chrome at 390×844 (iPhone 14-class), with
narrow (320×568) and landscape (844×390) checks where noted. No physical
device was available; see Limitations.

---

## Phase 1: baseline — what the live app actually does

Flow notes, captured before any change. Screenshots are in `before/`.

**Home.** Eleven cards with a title and a tagline each, a "Pick a game for
me" button, an optional roster, a gear. Nothing on Home says how many people a
game needs, how long it takes, or that two of the cards are drinking games.
The content level lives only behind the gear. `before/live-home.png`

**Pick a game for me.** Draws from all eleven at Spicy/Filthy and from nine
at Mild (the two drinking games are skipped). It does not look at the roster:
a table of two can be handed Odd One Out, which needs three.

**Content preference.** Settings said *"Mild. Plays sober, with anyone."*
while Kings Cup and Ride the Bus sat on the deck under it. What Mild actually
does is two things — it selects the prompt pools (each level adds to the ones
below; nothing is ever removed) and it stops the picker volunteering a
drinking game — and neither was stated. `before/live-settings.png`

**Ballpark.** Observed flow: "I'm Player 1" → "Flip" → target → "Good, next"
→ group dial → "Lock it in" → result. Two taps ask the same privacy question
twice, "Good, next" does not say that the target is about to vanish and the
phone is about to change hands, and nothing anywhere explains the objective.
The guessing card said "Drag anywhere on the dial" with the button disabled
until the dial had moved, so a table that genuinely wanted the middle had to
find out that a tap counts. `before/live-bp-*.png`

**Ballpark accessibility.** The revealed target dial exposed
`role="img"` with the label "Temporary to Permanent" — the two ends, and not
the target. The result dial was labelled the same way and distinguished the
two needles by colour only.

**Odd One Out.** Setup gave "Random" and "Categories" two full-width pills
directly above "Deal roles", for a setting that "Any" already covers. The hint
switch said "Show Imposter hint" and nothing about what a hint is. A roster of
twelve was silently trimmed to ten. `before/live-ooo-1-setup.png`

**Accidental exits.** The header X during a live Odd One Out reveal went
straight to Home, losing the word and the deal. Same in Ballpark mid-round,
Letter Rip mid-clock, and every other game. The browser's back button did
nothing at all (the app has no history entries).

**Backgrounding.** Ballpark already flipped its target card face-down when
the page was hidden. Odd One Out did not: hiding the page with a role on
screen and returning showed the role still up
(`before/live-ooo-4b-role-after-hide.png`).

**Updates.** The service worker was registered as `autoUpdate`: a new build
installed, claimed the page and reloaded it wherever it was. Round state is
deliberately in memory only, so an update landing mid-round erased the round.
Settings showed the build stamp but offered no way to check for a new one.

**Letter Rip and Kings Cup** played as expected. Letter Rip's clock is
deadline-based and keeps running while the app is backgrounded (by design; it
cannot be paused to gain time). Kings Cup at Mild gave no indication that the
level does not change its rules.

---

## What changed, and why

### Phase 2 — choosing a game

- **A cue line on every deck card**: *"3–10 players · ~5 min a round"*, plus
  *"drinking game"* where that is the mechanic. Player ranges come from the
  modes' own rules (Odd One Out's limits are the constants the mode enforces,
  and a test keeps the two in step). Durations are estimates and are written
  with a tilde; a *round* is distinguished from a *game* (Kings Cup runs to
  the fourth king). The tagline stays; the cue is smaller and dimmer.
- **One card tagged "Easy start"** — Letter Rip: no private screen, no setup,
  a one-sentence rule, fourth in the deck so it is on screen without
  scrolling. A single line under the pick button points at it until any game
  has been opened on the phone, then goes.
- **Pick a game for me respects the table.** It now draws from the games that
  fit the roster size (when there is one) and the content level, and says so
  underneath: *"6 of 11 games fit for 2."* With no roster it filters on level
  only. When nothing fits it says why and what would help — *"Add names on
  the roster: the smallest game takes 2."* — instead of picking something
  wrong or doing nothing. The ring flourish is unchanged.
- **The content level is on Home.** A quiet *Mild · Change* pill under the
  pick button opens Settings; it never competes with the deck.
- **Settings says what a level does.** Mild: *"Prompts anyone can play sober.
  Kings Cup and Ride the Bus stay on the deck, but Pick a game skips them."*
  Spicy and Filthy say they add and never remove. Kings Cup and Ride the Bus
  say, at Mild only, that they are drinking games at every level and suggest
  swapping drinks for dares. Manual selection and the picker now agree with
  the same wording.

### Phase 3 — Ballpark's first round

- **A short "How to play" card** opens the mode once per phone: three lines
  and a worked example drawn as a dial (Snack / Meal, target near Meal, clue
  "A burrito"). Skippable with one tap, and available again from a quiet
  "How to play" control on the handoff screen. Experienced tables never see it
  again.
- **One deliberate reveal.** The handoff card names who takes the phone and
  tells everyone else to look away; the one button is *Reveal my spot*. The
  spot stays hidden until that tap.
- **"Hide spot & pass phone"** replaces "Good, next". Hiding and changing
  screens happen in the same state change, so no frame shows the guessing
  screen with the target still up.
- **The guessing screen explains itself**: *"Everyone else: where was it? Tap
  or drag the dial to where Player 1's clue sits. The middle counts, but tap
  it."* A tap on the midpoint is a deliberate answer and enables Lock it in;
  only the untouched default is refused.
- **The round is a state machine** (`ballparkFlow.ts`). Every action is a
  no-op outside its phase, which is what makes rapid double taps harmless —
  the second press finds a state the first already left. Side effects
  (drawing, sounds) only fire when the state actually changed.
- **Result screen** names the zone and the gap in degrees, adds a legend in
  words for which needle is which, and describes both positions for screen
  readers.

### Phase 4 — Odd One Out setup

- **One category control** — *Category · Any · A different one every deal* —
  in the footer band, quiet, and "Deal roles" is the only loud thing. The
  picker gets a pinned *Any category* option. The header no longer repeats
  the category.
- **The hint switch explains itself** in one line that changes with its
  state: off, *"the Imposter plays on their ears alone"*; on, *"gets a
  one-word nudge nobody else sees, and can't say it as their clue."* The rule
  is repeated on the Imposter's own card and on the clues screen, as before.
- **The roster is used out loud.** *"Using your player names."*, *"The first
  4 of your 6 names play."*, and for twelve names: *"This plays up to 10, so
  the first 10 names play; reorder on Home to choose who."* Nothing is
  trimmed silently.
- **Handoffs name the next person**: *"Alex: show my role"*, then *"Hide &
  pass to Drew"*, then *"Hide & start clues"* on the last one. The cover
  card counts progress: *"1 of 3 have seen theirs."*
- No ballots, no scoring, no adjudication. The clues screen is as it was.

### Phase 5 — protecting rounds and secrets

- **"End this round?"** — one confirmation, shown only when leaving would
  throw a live round away. Each game declares its live phases (Odd One Out
  from the first cover to the clues; Ballpark from the reveal; Letter Rip
  while the clock runs; Rank It while ranking or guessing; Kings Cup with
  cards on the table; Ride the Bus mid-ride; Overbid during a challenge;
  Same Page mid-attempt; Hot Seat while playing). Setup screens, intros and
  results close immediately. *Keep playing* is the default and takes focus;
  Escape and the backdrop keep playing; focus returns to the X on cancel.
  The confirm is *Leave game*, because Letter Rip already has an *End round*
  button that means something else.
- **Browser back means the same as the X.** Opening a mode pushes one history
  entry; back asks to leave through the same guard, and a cancelled exit
  restores the entry.
- **Backgrounding hides secrets.** A shared hook watches `visibilitychange`
  and `pagehide`. Ballpark's revealed spot goes back to face-down and needs a
  deliberate re-reveal; Odd One Out's role goes back to the same player's
  cover — nothing advances. Public screens (guessing, results, covers) are
  untouched. This makes no claim about the operating system's app-switcher
  thumbnail, which was not verified.
- **Updates wait for a good moment.** The worker is registered as `prompt`
  instead of `autoUpdate`, so a new build installs and waits. Policy, as a
  pure function: found before anyone has touched the app (the cold-launch
  case, which is how an installed iPhone finds updates) → apply at once;
  found at Home → a small *A new version is ready · Restart* offer; found
  mid-round → held until the table is back on Home. Settings has a *Check for
  update* control that reports *Up to date*, *Restart to update*, or
  *Couldn't check. Offline?* — never "up to date" on a failed fetch.

### Phase 6 — accessibility and polish

- Dials that show a target now describe it: *"Your secret spot is 74% of the
  way from Hangover cure to Hangover cause."* The result dial describes the
  verdict, the spot and the table's guess. Positions use the spectrum's own
  words everywhere (shared `positionText`). Unrevealed spots are simply not
  rendered.
- Settings' three mutually exclusive controls are `radiogroup`/`radio` with
  `aria-checked`, not three pressed buttons. The sheet traps Tab, focuses its
  close button on open, and returns focus to the gear.
- Each game's new card takes focus when a phase changes, so a screen reader
  lands on the thing to read and the next Tab reaches the primary action.
- Short phones (≤660px tall): the intro card drops its illustration and the
  setup card its switch caption; both still fit.
- Landscape on a phone: the card slot was 24px tall on the live app (a
  height budget with nothing left). It now gets a 240px floor and the screen
  scrolls. Proportionate rather than a landscape redesign.
- Reduced motion: every new element inherits the global rule; the harness
  run with `prefers-reduced-motion: reduce` reaches the same screens.

---

## Before / after

Same flows, same viewport (390×844).

| Flow | Before (live, 27 Aug) | After (this branch) |
|---|---|---|
| Home | `before/live-home.png` | `after/after-home-first.png`, `after/after-home-roster2.png` (roster of 2 at Mild), `after/after-home-nofit.png` (roster of 1) |
| Settings | `before/live-settings.png` | `after/after-settings.png` |
| Ballpark: how to play | — (did not exist) | `after/after-bp-0-intro.png` |
| Ballpark: handoff | `before/live-bp-1-handoff.png` → `before/live-bp-2-facedown.png` | `after/after-bp-1-handoff.png` |
| Ballpark: the spot | `before/live-bp-3-clue.png` ("Good, next") | `after/after-bp-2-spot.png` ("Hide spot & pass phone") |
| Ballpark: after backgrounding | `before/live-bp-3b-after-hide.png` | `after/after-bp-2b-after-hide.png` |
| Ballpark: guessing | `before/live-bp-4-guessing.png` | `after/after-bp-3-guessing.png`, `after/after-bp-4-midpoint.png` |
| Ballpark: result | `before/live-bp-6-reveal.png` | `after/after-bp-6-reveal-final.png` |
| Leaving mid-round | (went straight to Home) | `after/after-bp-5-endround.png`, `after/after-ooo-6-endround.png`, `after/after-lr-endround.png` |
| Odd One Out: setup | `before/live-ooo-1-setup.png` | `after/after-ooo-1-setup.png`, `after/after-ooo-1b-hint-on.png`, `after/after-ooo-1-setup-12.png` (roster of 12) |
| Odd One Out: picker | `before/live-ooo-2-picker.png` | `after/after-ooo-2-picker.png` |
| Odd One Out: cover and role | `before/live-ooo-3-cover.png`, `before/live-ooo-4-role.png` | `after/after-ooo-3-cover.png`, `after/after-ooo-4-role.png` |
| Odd One Out: role after backgrounding | `before/live-ooo-4b-role-after-hide.png` (still showing) | `after/after-ooo-4b-after-hide.png` (back on the cover) |
| Kings Cup at Mild | `before/live-kc-1-open.png` | `after/after-kc-mild.png` |
| Update ready | — | `after/after-update-offer-home.png` |
| Narrow phone (320×568) | `before/live-narrow-ooo-setup.png` | `after/after-narrow-bp-intro.png`, `after/after-narrow-ooo-setup.png` |
| Landscape (844×390) | `before/live-land-bp-guessing.png` | `after/after-land-bp-guessing.png` |

---

## Decision log

- **Base the work on `origin/main`, not the local branch.** The local tree
  was two weeks stale and `main` had already absorbed and partly reverted
  it. Merging it forward would have re-introduced experiments the author
  had taken out. The uncommitted files were committed verbatim on their own
  branch instead of being reset.
- **Cue line, not a bigger card.** Three lines of writing per card cost 20px
  of peek each; the deck still shows five cards above the fold at 844pt. A
  second row of icons or a longer card would have turned the deck into a
  list.
- **Letter Rip as the starter, not Most Likely To.** Most Likely To is the
  simplest rule in the app but needs three people and sits tenth in the
  deck; the pointer would name a card nobody can see. Letter Rip is two-plus,
  visible without scrolling, and its ten-second clock stops anyone lecturing.
- **Ranges are minimums where the code has no maximum.** "2+ players" is
  honest; inventing a comfortable maximum would be false precision. Overbid
  caps seats at 8 without a roster but deals every name with one, so it is
  listed as 2+.
- **Mild keeps the drinking games on the deck.** Hiding cards would break the
  app's one content rule (a level adds, never removes). What changed is what
  the app volunteers and what it says.
- **The reveal button no longer carries the name.** "Player 1: reveal my
  spot" wrapped to two lines at the primary size; a sixteen-character roster
  name would be worse. The card names the person twice instead. The old
  argument for the name on the button (a reflex tap by the wrong hand) is
  answered by the card copy and by the fact that the button now says what it
  does.
- **Midpoint by touch, not by default.** Keeping "disabled until touched"
  preserves the author's reason for it (an untouched default is a round the
  table can sit out) while making the middle a one-tap answer — and saying so
  on the card.
- **A confirmation, not a resume mechanism.** Persisting round state would
  mean restoring a secret onto a visible screen or building a re-reveal flow
  for every game. One dialog, only on live phases, covers the observed
  failure without a confirmation on ordinary taps.
- **`prompt`, not a smarter `autoUpdate`.** The reload is the problem; the
  only way to stop it is a worker that waits. Applying at cold launch keeps
  installed phones current without a tap; offering at Home keeps the restart
  a decision.
- **Logic tests, not DOM tests.** The failure modes worth pinning are in pure
  modules (fit, the two flows, the update policy, the deck seam). The
  components stay thin over them and the production build is checked in a
  real browser instead. Vitest is the one added dev dependency.
- **Landscape gets a floor, not a layout.** The pre-existing collapse was
  fixed with a minimum card size and a scrolling screen. A real landscape
  design is out of scope for a portrait pass-the-phone game.

---

## Tests and checks performed

**Automated** (`npm test`, 48 tests): game eligibility by roster size and
content level, including the registry/mode-constant agreement and the single
starter; random pick with missing roster, with a pinned rng, and with no
qualifying game; Odd One Out deal, reveal order, player-count clamping,
roster notes, hide-without-advancing, role→cover only; Ballpark reveal, hide
and pass in one step, re-hide on backgrounding without advancing, midpoint
by touch, rapid duplicate taps, next-round reset, intro on request; deck
exhaustion and the reshuffle seam; the deadline clock across a backgrounded
gap; update policy (apply / offer / hold), a failed check reported as
unavailable, no worker, current, ready; exit guard — setup closes, live
phases ask, cancel keeps the round.

**Static**: `npm run lint` (7 warnings, all the pre-existing
`only-export-components` class plus one unchanged hook-deps note; no errors),
`tsc -b` clean, `npm run build` producing the PWA (`sw.js` with a
`SKIP_WAITING` message listener and no unconditional `skipWaiting`,
15 precache entries, `start_url`/scope `/last-call/`).

**In headless Chrome against the production build served at `/last-call/`**:
every flow in the before/after table, at 390×844, 320×568 and 844×390, and
with `prefers-reduced-motion: reduce`; accessibility labels on the dials;
focus placement after phase changes, in the end-round dialog, and on cancel;
Escape closing the dialog with the round intact; browser back opening the
dialog; the service worker serving the app after the server was killed;
*Check for update* reporting "Couldn't check. Offline?" with the server down;
a second build found during a Ballpark round being held (no reload, no offer
in-game), then offered on Home, then applied by *Restart* with the build
stamp changing; a waiting build applying itself on a reload with no
interaction (the cold-launch path), stamp changing without a tap.

**Limitations.** No physical device: installed-iPhone behaviour, the iOS
app-switcher thumbnail, haptics and the real cold-launch update check were
not verified. Headless Chrome's offline emulation does not reach service
worker fetches, so "offline" was simulated by killing the server, which
covers the cache path but not a captive portal or a slow network. Text
enlargement was not exercised beyond the stylesheet's existing rem ramp.
Motion was judged from stills and step timing, not on a phone — the
project's own notes say the desktop preview hides frame-rate faults.

---

## Usability session plan

Groups of three to five who have not played these games. One shared phone,
no facilitator instructions beyond "here's the app, play something."

Observe, per group:

1. **Time to a suitable game** — from unlock to the first game screen, and
   whether the choice fit the group (size, sobriety, mood). Note whether
   they used the cue lines, the pick button, or scrolled.
2. **Time to the first meaningful turn** — the first clue given, first letter
   tapped, first role hidden.
3. **Requests for explanation** — every "what do I do?", who answered it, and
   whether the answer came from the screen or from a person.
4. **Wrong taps and accidental exits** — X presses, back presses, the dialog
   appearing, and what they chose.
5. **Accidental private reveals** — anyone else seeing a spot or a role; the
   phone put down face-up; the app backgrounded with a secret up.
6. **Whether someone became the instructor** — did one person end up reading
   every screen aloud, and for how many rounds.

Run Ballpark and Odd One Out with every group; let them pick a third. Run
half the groups at Mild with no roster and half at Spicy with names entered,
to see the fit line and the drinking-game wording in both states. Ask
afterwards what each game was for, in their own words — the answer says
whether the first round taught it. None of these numbers exist yet; a
smaller button count is not evidence.
