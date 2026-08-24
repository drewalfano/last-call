# Architecture decisions

Thirty decisions in this codebase that a reader could reasonably stop on and
ask "why is it done this way?" — because each one had a plausible alternative
that was not taken.

Each entry states **the decision**, **the alternative rejected**, and **the
consequence of choosing it**. This is an inventory, not an assessment: nothing
here is graded, and nothing is attributed.

Grouped by area: [motion system](#motion-system), [mode
architecture](#mode-architecture), [state handling](#state-handling), [tablet
layout](#tablet-layout), [offline behaviour](#offline-behaviour),
[sound](#sound).

---

## Motion system

### 1. Mode entry and exit are driven from the Web Animations API, not CSS

**Decision.** The launch and close overlays in `src/App.tsx` are animated by
`element.animate()` with inline keyframes, not by adding a class and letting a
stylesheet transition run. Both the clip-path expansion and the contraction,
the two face fades and the dissolve are `Animation` objects held in refs
(`launchAnims`).

**Rejected.** A CSS class-driven transition, which is what the rest of the app
uses for everything else.

**Consequence.** The expansion is interruptible: `reverseLaunch` calls
`reverse()` on the live `Animation`, so a tap 10% in takes 10% of the time to
come home and a tap at 90% takes 90%. That is only possible because the object
is kept rather than thrown away. The cost is that the four motion constants
this needs (`LAUNCH_MS`, `LAUNCH_EASE`, `CLOSE_MS`, `CLOSE_EASE`) are strings
and numbers in a `.tsx` file rather than tokens, so they sit outside the
`tokens.css` single-swap-point rule that every other value in the app obeys.

### 2. The screen swap happens under the overlay, and the close target is measured rather than remembered

**Decision.** `setScreen` is called from the launch animation's `onfinish` and
the overlay is held two more `requestAnimationFrame` ticks before retiring. The
close is the mirror: the overlay paints opaque on its first frame, Home mounts
underneath it, and only then does a `requestAnimationFrame` start the
contraction — against a rect read with `getBoundingClientRect()` at that
moment. The only thing carried across from before the mode opened is Home's
scroll offset (`homeScroll`, restored in a `useLayoutEffect` before paint).

**Rejected.** Swapping the screen first and animating over the result; and,
for the close, storing the launch rect and contracting back into it.

**Consequence.** The unmount/mount hitch — measured in the source at 16.5ms
against a steady 8.3 — lands on a frame where an opaque field of colour covers
the display, so it does not read as a dropped frame. It is also why the overlay
lives in `App` rather than in `Home`: it has to outlive the swap. Measuring
rather than remembering means the target is right even though Home was
unmounted for the whole mode and comes back at scroll zero, at the cost of
three corrections the measurement would not otherwise need — undoing
`screen-in`'s in-flight translate (`DOMMatrix(...).m42`), clamping the bottom
edge to the next card's top because the deck overlaps, and pinning the radius
to a constant `28px` rather than the card's real `28px 28px 0 0`.

### 3. Reduced motion gets a designed 130ms colour dip, not a bypass

**Decision.** `prefers-reduced-motion` does not skip the transition. Both
directions still put the pack colour over the screen and take it off again —
`REDUCED_MS` split into a cover half and a clear half, with the screen swap in
between — with no travel, no clip and no deck movement.

**Rejected.** Checking the query and calling `setScreen` directly, which is
what the code did previously.

**Consequence.** No frame where the entire display changes colour and content
at once with nothing relating the two states. The cost is a third code path in
each direction, each needing its own failsafe timeout, and the same check
duplicated in `Home.tsx`'s `pickForMe` so the flourish's two waits collapse to
zero.

### 4. Timed exits are held by `setTimeout`, never by `animationend`

**Decision.** Every element that has to survive its own exit animation is held
by a JS timer whose duration restates a CSS one: `LEAVE_MS` in
`GameHeader.tsx`, `BOARD_LEAVE_MS` in `LastWord.tsx`, `LEAVE_MS` in
`Settings.tsx`, `CLOSE_FAILSAFE_MS` and `reverseFailsafe` in `App.tsx`.

**Rejected.** Listening for `animationend`, which is the event built for this.

**Consequence.** A surface that never painted — a deferred render, a
backgrounded tab — still unmounts, so nothing can be stranded on screen with no
handler left to dismiss it. In exchange, several durations exist twice: once as
a token in CSS and once as a literal in TSX, agreeing only by hand.

### 5. Staggers use `backwards` fill, never `both`

**Decision.** Every staggered arrival in the app is inline `--i` plus
`animation-delay: calc(var(--i) * Nms)` with `backwards` fill. The reasoning is
written out three times in `games.css`.

**Rejected.** `both`, which is the more usual choice and holds the settled
state.

**Consequence.** `both` would leave `transform: none` in force, and a held
`none` computes to an identity matrix — still a transform, which outranks the
`:active` press and kills tap feedback on every staggered element. The knock-on
is that the global `prefers-reduced-motion` rule is not sufficient on its own:
it zeroes `animation-duration` but not `animation-delay`, so every staggered
thing needs its own targeted `animation: none` block — the stylesheets carry
fifteen `prefers-reduced-motion` blocks rather than leaning on the global one.

---

## Mode architecture

### 6. Navigation is a `switch` on one state value, not a router

**Decision.** `App.tsx` holds `screen: ModeId | null` and `renderScreen`
switches on it. There is no route table, no history integration and no URL that
names a mode.

**Rejected.** A router — the file says so in its opening comment.

**Consequence.** No bundle cost and no cold-start cost for navigation that is
flat and one level deep. Also no deep links and no browser-back integration:
the only way out of a mode is the chevron, and the hardware back gesture does
not map to it. Because leaving unmounts the mode, exiting ends the round by
construction rather than by a rule someone has to remember.

### 7. Modes are individual files; the shared deck-game wrapper was removed

**Decision.** Each of the eleven modes is its own component with its own phase
type. What they share is a shell (`GameScreen`, `CardBody`), a deck hook
(`useDeck`), a pool resolver (`usePool`) and a handful of components — not a
mode template.

**Rejected.** A generic reveal-and-draw wrapper. One existed and held five
modes; `MOTION-AUDIT.md` still references `DeckGame.tsx`, which is no longer in
the tree.

**Consequence.** Modes whose only distinguishing feature was the wrapper were
retired rather than kept: `README.md` records Drink If…, Never Have I Ever and
Happy Hour Qs going for exactly that reason, taking the count from eleven to
ten before Ballpark restored it. Content from the retired modes is kept
unimported (`src/data/drinkIf.ts`) rather than deleted.

### 8. Mode ids are frozen and no longer match their titles

**Decision.** Four modes were renamed on screen and their ids were not: Odd One
Out is `imposter`, Letter Rip is `last-word`, Same Page is
`say-the-same-thing`, Overbid is `the-number-game`. Files, data exports and
`--cat-*` tokens all keep the old names.

**Rejected.** Renaming through — around thirty sites, per `README.md`.

**Consequence.** Nothing a player sees is attached to an id, so the rename cost
nothing. Reading the code requires a translation table: `--cat-imposter` is Odd
One Out's yellow, and searching for `--cat-odd-one-out` finds nothing. The
colour table in `README.md` carries an explicit token column for this reason.

### 9. The app deals; it does not adjudicate

**Decision.** Stated as a principle in `README.md` and visible in the code:
Letter Rip has no answer validation, Kings Cup tracks only mate pairings, Odd
One Out has no ballot or reveal, Ballpark computes a distance and three
proximity zones but keeps no score. `VotePad.tsx` survives only as
`PlayerPicker`, used by Kings Cup and Hot Seat to choose a person.

**Rejected.** On-screen voting, scoring and rule tracking — several of which
existed and were removed (the vote pad and Drink If's survivor tracker are both
named in `global.css` as having gone).

**Consequence.** The app runs only what a group cannot run itself — shuffling,
secret roles, timers, a 52-card deck. It also means the sound for a Ballpark
result had to be re-keyed from a score to a distance when the score went away,
and is deliberately coarse (three outcomes) so a scoring table does not
reappear inside `audio.ts`.

### 10. The card sits in a fixed slot, not in leftover space

**Decision.** `.screen:has(.focal--slot)` is a three-row grid: a header row
with a computed minimum, a card row of exactly `--slot-h`, and a footer row.
`--gheader-h` and `--gfooter-h` are hand-measured worst cases recorded in
`tokens.css` (Hot Seat's wrapped question header; Overbid's bidding footer).

**Rejected.** Centring the card in whatever the header and footer leave over,
which is what the app did before. `tokens.css` records the symptom: Imposter's
setup put the card 79px lower than its own reveal screen.

**Consequence.** The card's rectangle is a constant across every screen of
every mode, so nothing moves between prompts. The reserves are measurements
rather than derivations and go stale when type or control heights change —
`tokens.css` says to walk the modes and take the largest `.gfoot`
`scrollHeight` rather than reason about it, after a first pass missed the
tallest footer by 62px. Screens with no card opt out entirely and render a
plain `.focal`.

---

## State handling

### 11. Four independent contexts, not one store

**Decision.** `ThemeProvider`, `ContentModeProvider`, `RosterProvider` and
`RingStyleProvider` nest four deep in `main.tsx`. Each owns its own
localStorage key, its own read/write helpers and its own try/catch.

**Rejected.** A single settings context or reducer holding all four.

**Consequence.** Each setting can be read without pulling in the others, and
each persists independently. The storage-guard logic is written out four times
in slightly different shapes (`readStored` in `contentMode.tsx`,
`readPreference` in `theme.tsx`, `read` in `ringOrder.tsx`, `readPlayers` in
`roster.tsx`).

### 12. Theme persists the preference, including "device"

**Decision.** `lastcall.theme` stores `"dark" | "light" | "device"`. The
context exposes both `preference` (what was chosen) and `theme` (what it
resolves to now), and a `matchMedia` listener updates the resolved value live.

**Rejected.** Storing the resolved value.

**Consequence.** A phone flipping to dark at sunset takes the app with it. The
comment states the failure the other way round: storing the resolved value
would freeze the choice the first time the device changed. Two values in the
context instead of one.

### 13. Content is one global ordered tier that only ever adds — and its keys are not its labels

**Decision.** `CONTENT_TIERS = ["safe", "night", "filthy"]`. Raising the tier
adds the next pool and never removes a lower one. There are two layout
policies — `supplement` (concatenate; consumers shuffle) and `lead`
(round-robin from the top tier down) — and no third. On screen the same three
values are Mild / Spicy / Filthy, rendered as a dot and two flames with no
visible text at all (`TIERS` in `Settings.tsx`).

**Rejected.** Three things. Per-game ratings, which do not exist anywhere.
`replace`, which did exist and was the default: `pools.ts` records that it was
removed outright rather than left unused, on the grounds that an option the
project has decided against is one the next mode falls into by accident. And
renaming the internal keys to match the labels, which would churn ten data
files.

**Consequence.** A Filthy deck is safe + night + filthy, so the material grows
rather than swaps, and the choice between the two remaining policies is made
per file on one question — is this list browsed or dealt blind. `roundRobin`
deals one entry per tier top-down rather than nesting `lead` calls, so a
four-entry filthy pool seasons the top of a forty-entry list instead of
monopolising it. Keeping the keys frozen means the wording can change without a
data edit, at the price of the code and the UI using different vocabularies for
the same three values — and `README.md` still documents the older two-tier
Safe / 19+ presentation.

### 14. Game state is never persisted

**Decision.** Only settings, the roster and the mute flag survive a refresh.
No mode writes its round to storage. Stated in `contentMode.tsx`, `roster.tsx`
and `README.md`.

**Rejected.** Resuming a round after a reload.

**Consequence.** A refresh mid-party lands on Home rather than resurrecting a
half-played round, which is the same behaviour as leaving a mode. The roster is
the deliberate exception — losing the table to a stray refresh is treated
differently from losing a round.

### 15. Sound's mute lives outside React

**Decision.** `lastcall.audio.muted` is read and written by the `AudioManager`
singleton in `lib/audio.ts`. It is not a fifth context.

**Rejected.** Putting it beside the other four settings.

**Consequence.** Every reader of the flag is a sound about to play rather than
something on screen, so nothing needs to re-render when it changes.
`SettingsSheet` is the single exception and holds a local `soundOn` seeded from
`audio.isMuted()` — a mirror, with the manager still the source.

---

## Tablet layout

### 16. One breakpoint, gated on both axes, and expressed only in CSS

**Decision.** `@media (min-width: 640px) and (min-height: 600px)`, written out
across seventeen separate blocks in the three stylesheets, with the canonical
reasoning recorded once in `tokens.css` and a note telling the reader to grep
`640px` and change every copy together. Nothing reads the viewport in
JavaScript — `tokens.css` states the rule directly: nothing in the app reads
`window.innerWidth` into state, and nothing should start.

**Rejected.** Width alone; and a JS breakpoint or resize-driven layout mode.

**Consequence.** Height is what separates the two device classes: an iPhone 16
Pro Max in landscape is 932pt wide — wider than an iPad mini in portrait — and
width alone would hand it 76pt buttons in 430pt of height. `tokens.css` lists
the nine geometries it catches and deliberately misses, including an iPad in
half-split portrait (507×1366), which is classed as a phone. Keeping it in CSS
means Split View and Stage Manager can resize the window mid-session with no
reload and the layout re-evaluates for free, where stored state would go stale.
In exchange the literal is duplicated everywhere it is needed, since CSS cannot
name a media query, and anything the tablet needs must be expressible as one —
which is why composition changes like Letter Rip's board and the picker's
columns are stylesheet rules rather than component branches.

### 17. Only one control per screen doubles

**Decision.** At the breakpoint `--action-height` goes to 120px while the three
ordinary tiers take a notch (84 / 64 / 52). `--action-height` exists purely so
the grounded primary action can break the ratio; it is hung off `.btn--lg`,
which every mode already uses exactly once per screen.

**Rejected.** Scaling `--control-height` and letting the tiers follow.

**Consequence.** The button reached for from a seat away is enormous, while
chips, steppers, category cards and list rows — which are aimed at
deliberately — stay small enough that a page of options does not become a wall
of empty boxes. It costs one extra token that is a no-op on phones, where
`--action-height` is simply `var(--control-height)`.

### 18. The frame and the reading column part company

**Decision.** At tablet size `--app-max-width` goes to 980px while
`--content-max` goes to 700px. On a phone they are the same number and the
second token does nothing.

**Rejected.** One max-width for both.

**Consequence.** Boards, decks and grids get the display; cards stop well short
of it, at about fourteen words of prompt to a line. Keeping them as one number
would mean choosing which to get wrong — a 480px card in a 1024pt display, or a
category grid locked to the width of a paperback.

### 19. Slot height is split from card size at the breakpoint

**Decision.** `--slot-h` is a separate token that equals `--card-size` on a
phone and diverges on a tablet, where width comes from the column alone and
height gets its own `min()` of three terms.

**Rejected.** One number for both axes, which is what a square card suggests.

**Consequence.** `--card-size`'s third term is a *height* budget, and feeding it
into a value that also sets width meant a squeezed landscape screen produced a
small card rather than a short one. `tokens.css` records the measurement: at
1194×834 a card with 668px of column available was drawn 222px wide, clipping
Imposter's stepper row inside the card's own `overflow: hidden`.

### 20. Private screens opt back down to phone type

**Decision.** `GameScreen` takes an `isPrivate` flag, applied by Imposter's
role reveal and Rank It's private pass and nothing else. `.screen--private`
restores the phone's `--fs-prompt` clamps and narrows the slot to a 448px
square inside the untouched row.

**Rejected.** Letting the tablet type ramp apply everywhere.

**Consequence.** The ramp exists so a table reads the card together, which on
these two screens is the failure rather than the feature. The row height is
deliberately left alone so the live line does not move between a private screen
and a public one; only the box inside the row changes. The prop is `isPrivate`
because `private` is a reserved word in strict mode.

---

## Offline behaviour

### 21. There is no network layer at all

**Decision.** No `fetch`, no `XMLHttpRequest`, no analytics, no accounts. Every
pool is a static import from `src/data/`, the deck is synchronous, and the PWA
precaches every build asset (`globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"]`).

**Rejected.** Fetching content at runtime.

**Consequence.** The app opens and plays with no signal, which `vite.config.ts`
calls a hard requirement rather than a nicety. There are also no loading states
anywhere — `MOTION-AUDIT.md` flags this explicitly, noting that a spinner here
would be motion with nothing behind it. Adding a single card requires a build
and a deploy.

### 22. The service worker updates silently

**Decision.** `registerType: "autoUpdate"` with `registerSW({ immediate: true })`,
plus `cleanupOutdatedCaches`.

**Rejected.** A prompt-to-refresh flow.

**Consequence.** A returning user picks up new content on their next launch
with no interaction. There is correspondingly no way to ask the app whether it
is current — and iOS only checks for a new service worker on a cold launch, so
a home-screen icon can serve a days-old build. That gap is what the build stamp
exists to close.

### 23. The build is dated, not numbered

**Decision.** `vite.config.ts` bakes `__BUILT_AT__` as an ISO instant at build
time; `Settings.tsx` renders it through `toLocaleString` with no locale
argument.

**Rejected.** Two alternatives, both recorded. Semver — described as a promise
about compatibility made to integrators who do not exist here, and a number
someone has to remember to bump. And a date plus a short commit sha, which was
what shipped previously.

**Consequence.** "Is this current" becomes "is this today", answerable on sight
with nothing to look up. The split between baking an instant and formatting on
the device is what makes it readable: Actions builds in UTC, so a string
formatted at build time would read hours off on the one phone it exists for.
Two pushes in the same minute are indistinguishable, and the sha that used to
tell them apart is gone.

### 24. One env var flows into base, start_url and scope

**Decision.** `VITE_BASE` sets Vite's `base` and is threaded into the
manifest's `start_url` and `scope`. `deploy.yml` derives it from the repository
name by default, with a repo Actions variable overriding for a user page or
custom domain.

**Rejected.** Hardcoding a project path, or setting the manifest separately.

**Consequence.** A service worker can only control the path it is served from,
so a mismatch between these three would silently break installation and offline
support — the failure has no error, only an app that stops working when the
signal does. Deploy target changes are a variable, not a diff.

### 25. The manifest asks for `orientation: "any"`

**Decision.** No portrait lock.

**Rejected.** `orientation: "portrait"`, which the manifest previously
requested.

**Consequence.** `vite.config.ts` records that the lock never did anything on
the platform it was written for — iOS and iPadOS do not implement the
manifest's `orientation` member for home-screen web apps — and that where it
*is* honoured, on Android and desktop Chrome, it now contradicts a tablet
layout built for a device propped on a table. The change is a no-op on the
target device and stops the manifest disagreeing with the stylesheet
everywhere else.

---

## Sound

### 26. Every sound is synthesised; there are no audio files

**Decision.** `lib/audio.ts` builds all thirteen sounds from two primitives —
a band-passed burst of a pre-minted white-noise buffer, and a pitched
oscillator tone with an exponential envelope.

**Rejected.** Shipping samples.

**Consequence.** Nothing to precache, nothing to 404, and nothing that can be
missing the first time a phone opens the app on a pub's wifi — which the file
notes a folder of mp3s would quietly undo. It also bounds the vocabulary: a
synthesised sound is a shape describable in code, so everything here is a
click, a thud, a buzz or two notes, and nothing runs longer than half a second.

### 27. The card sound fires on draw, not on the flip

**Decision.** `audio.play("card")` lives in `useDeck`'s `draw`, `reset` and
`skipTo` — three call sites in `lib/deck.ts` — rather than at the eleven modes,
and rather than being hung off the flip animation.

**Rejected.** Hooking the card-flip animation, described in both `deck.ts` and
`audio.ts` as the obvious hook and the wrong one.

**Consequence.** Every phase change also flips a card, so the animation hook
sounded Odd One Out's cover screens and every mode opening. Drawing is the
game; those are transitions. The deliberate omission is the source-change
effect that rebuilds the deck when the content tier flips — it sets state
directly rather than going through `draw`, so opening a mode arrives in
silence.

### 28. The iOS audio session is `transient`, not `playback`

**Decision.** `SESSION_TYPE = "transient"`, applied through the non-standard
`navigator.audioSession` on every unlock, behind a narrow interface declaration
rather than an `any`.

**Rejected.** `playback`, which was what shipped and which plays through the
hardware ringer switch.

**Consequence.** Two costs went away: Now Playing opening in the Dynamic
Island, because a page claiming to be media gets media controls; and
`playback`'s specified refusal to mix, which meant a letter tap stopped
whatever the table had on. What it gives up is the ringer switch — a silenced
phone now hears nothing. The file notes this could not be settled off the
device, because Safari owns the Now Playing session for its own tabs and a test
page in a tab shows no difference at all.

### 29. Levels are set by repetition rate, not by event importance

**Decision.** `card` is the quietest sound in the app at `gain: 0.05` with a
43ms swell; `dial` is held to 0.06; `match` is the only sound allowed extra
length. Each level carries a comment naming the rate it is written for.

**Rejected.** Mixing by how significant the event is.

**Consequence.** The most frequent sound is the faintest, on the reasoning that
a sound at that rate is judged on the tenth one rather than the first. It also
shapes the design of `verdict`, which reads distance and is deliberately coarse
— three outcomes — so that a thresholds table does not reappear in the audio
file after the mode threw its scoring away.

### 30. Haptics and sound are parallel channels, and neither is required

**Decision.** `buzz()` (`useCountdown.ts`) and `audio.play()` are fired at the
same events, and `audio.ts` states the rule: where you find one you should
generally find the other. Neither is load-bearing — every one of those moments
still has to read from the screen alone.

**Rejected.** Treating either as the confirmation.

**Consequence.** iOS Safari has no Vibration API, so `navigator.vibrate?.()` is
a no-op there rather than an error; a silenced phone has no sound. The
asymmetry is that sound has a mute in Settings and haptics has none. `buzz` is
also redefined locally in `LastWord.tsx` rather than imported, so that one
mode's haptics do not route through the shared helper's try/catch.

---

## Cross-cutting notes

Three conventions recur across areas and are worth reading as decisions in
their own right:

- **Documented removals.** Options that were tried and rejected are frequently
  deleted *and* written down — `replace` in `pools.ts`, `--expand-lead` and
  `--stagger-step` in `tokens.css`, the retired lavender pack colour, finding
  **L** in `MOTION-AUDIT.md`, which is recorded as reversed rather than
  removed. The stated reason is that an unrecorded rejected option is one the
  next change falls into by accident.
- **Numbers that must agree across a language boundary.** Several CSS durations
  are restated as JS literals (`LEAVE_MS`, `SETTLE_MS`, `DECK_CARD_MS`) because
  a timeout cannot read a custom property. Each carries a comment naming the
  token it must match.
- **The two long-form docs describe earlier states of the code.** `README.md`
  documents two content tiers where `contentMode.tsx` has three, and says "Ten
  modes" in its opening line and its heading while the table under that heading
  lists eleven. `MOTION-AUDIT.md` records delay as the one axis with no tokens,
  which `tokens.css` now has (`--stagger-deal`), and references a `DeckGame.tsx`
  that is not in the tree. The same count is split across the build too: the
  manifest description in `vite.config.ts` says ten, `index.html`'s says eleven.
  Both docs are dated records rather than current specifications, which is worth
  knowing before reading either as the reason for something in the code.
