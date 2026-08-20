# Motion audit

Inspection only. Nothing in this document has been implemented.

Reference pattern is **Letter Rip** (`src/games/LastWord.tsx`, `src/styles/games.css:1150–1250`).
Every proposal below is expressed in terms of a primitive that already exists in
the codebase. Where I think a new token is genuinely needed it is in
[New tokens](#new-tokens-flagged-separately) and nowhere else.

---

## 1. The existing motion architecture

### Where the values live

All of them are in `src/styles/tokens.css`, under `/* --- Motion --- */`
(lines 258–290) and `/* --- The press --- */` (lines 292–312).

| Axis | Tokens |
|---|---|
| Easing | `--ease-spring`, `--ease-out`, `--ease-glide`, `--ease-in-out` |
| Duration | `--dur-instant` 90ms, `--dur-fast` 160ms, `--dur-base` 260ms, `--dur-slow` 460ms, `--dur-wheel` 4200ms |
| Press | `--dur-press` 120ms, `--press-scale` 0.97, `--press-scale-sm` 0.92, `--press-dim` 0.85 |
| Delay | **none** |

Two observations worth recording:

- `--dur-instant` and `--dur-wheel` are **defined and never used**. `--dur-wheel`
  is a leftover from a wheel/spinner that is not in the tree.
- **Delay is the one axis with no tokens at all.** Every stagger step and every
  sequencing delay in the app is a literal. That is deliberate in most cases and
  accidental in two — see [New tokens](#new-tokens-flagged-separately).

Two motion values live **outside** `tokens.css`: `LAUNCH_MS = 520` and
`LAUNCH_EASE` in `src/App.tsx:32-33`. They are the only ones.
`src/games/Home.tsx:105-137` also holds the pick-for-me flourish's timing
(`RING_MS`, `REVEAL_MS`, `DEAL_STEP_MS`, `PICK_STEP_MS`, …), but those are fed to
the stylesheet as custom properties by design and are documented as such.

### Centralised, or reimplemented per component?

**Values: fully centralised.** I found no hard-coded easing curve and no
hard-coded duration in any component, outside the two files named above. The
rule stated at the top of `tokens.css` holds.

**Application: per component.** The shared press —

```css
transition: transform var(--dur-press) var(--ease-out),
            opacity   var(--dur-press) ease-out;
/* … */
:active { transform: scale(var(--press-scale)); opacity: var(--press-dim); }
```

— is written out across **eighteen distinct selectors** (sixteen at the time of the
audit; `.sheet__close` and `.segmented__opt` were added by findings **F** and **G**).
There is no `.pressable` utility. Most copies are identical apart from which scale
token they pick, and the one control in the app with no press feedback at all
(finding **F**) was missed precisely because there is no shared class to forget to
apply.

`prefers-reduced-motion` is likewise handled in **eight separate blocks**
(`global.css:531`, `:1279`; `games.css:248`, `:677`, `:1241`, `:1921`, `:2483`,
`:2879`) rather than one.

### Reusable primitives that already exist

| Primitive | Defined | Applied to | What it is for |
|---|---|---|---|
| `card-flip-in` | `global.css:947` | `.card--dealt`, `.slot > .card`, `.pcard` | **The** card arrival. 180° `rotateY`, `backface-visibility: hidden`, `--dur-slow`. Replays by remount. |
| `pop` | `global.css:1034` | `.focal.lw .actions`, `.kc__below`, `.lc-tier` | A small non-card element arriving on a surface that is holding still. Fade + 8px rise + 0.96 scale. |
| `screen-in` | `global.css:143` | `.screen` | Every screen mount. Fade + 10px rise, `--dur-base`. |
| `fade-in` | `global.css:1237` | `.modal-backdrop`; reversed for `.focal.lw[data-leaving] .actions` | Plain opacity. Note the `reverse forwards` trick already in use. |
| `modal-in` | `global.css:1253` | `.modal`, `.sheet` | Presentation entrance. `--ease-spring`. |
| `live-in` / `live-drop` / `live-out` | `global.css:467`, `:508`, `:524` | `.gheader__live` | The live line arriving, travelling to the round-over screen, and leaving. |
| `pulse` | `games.css:1065` | `.lw__timer[data-low]`, `.num__bid-n[data-low]` | A clock in its last seconds. Already shared across two modes. |
| `beat` / `slam` | `games.css:2617`, `:2625` | `.countdown__n`, `.countdown__word` | A numeral changing; a word landing. |
| **The stagger idiom** | — | `deck-deal`, `picker-deal`, `lw-key-in`, `rank-settle` | Inline `--i` + `animation-delay: calc(var(--i) * Nms)` + **`backwards`**, never `both`. The `backwards` reasoning is documented three times (`games.css:245`, `:1173`, `:2466`) and is load-bearing: `both` leaves a settled `transform: none` that outranks `:active` and kills the press. |
| **The timed-exit idiom** | — | `GameHeader.tsx:98-120` (`LEAVE_MS`), `LastWord.tsx:26-92` (`BOARD_LEAVE_MS`) | JS state → `data-leaving` attribute → `setTimeout`, **never** `animationend`. Both files document why: a timeout fires whether or not anything painted. |
| **The reserved-slot idiom** | — | `.gfoot__skip[data-hidden]`, `.rtb__verdict[data-hidden]`, `.roster__clear[data-hidden]` | `visibility: hidden` holds the row so nothing jumps. Only the third of the three actually animates — see finding **M**. |

### The reference: what Letter Rip actually does

Worth stating plainly, because it is the bar the rest of the report measures against.

- **Board entrance** (`games.css:1176-1200`): the ring lands on `lw-ring-in`, the
  twenty tiles cascade behind it on `lw-key-in` at a **10ms** step (`animation-delay:
  calc(var(--i) * 10ms)`), and the way out of the round arrives last on `pop` at a
  260ms delay. Reading order — clock, then the letters you are about to use, then the exit.
- **`scale`, not `transform: scale()`** — because at tablet size the tiles *are* a
  transform, and animating `transform` would throw the ring placement away.
- **Board exit** (`games.css:1221-1240`): everything leaves **together and faster**
  (`--dur-fast`), back along the same scales, with `forwards` so it holds its end
  state through the beat before unmount. The comment says why an exit is not
  staggered: "twenty tiles taking their time about news that has already broken."
- **The category travels** (`global.css:487-517`): a relative `live-drop` translate
  rather than a FLIP, so a stalled frame leaves the line legible at 48px off rather
  than parked behind the letter grid.
- **Reduced motion**: its own block at `games.css:1241`, listing all six selectors.

Three things generalise from it, and I have used them as the test for every finding
below: **arrivals are staggered and exits are not**; **an exit is driven by a
timeout, never by an animation event**; and **every staggered thing gets its own
reduced-motion block.**

---

## 2. Is `prefers-reduced-motion` respected?

**Yes, and more carefully than most codebases.** Three layers:

1. **A global nuke** at `global.css:1279` — `*, *::before, *::after` get
   `animation-duration: 0.01ms`, `animation-iteration-count: 1`,
   `transition-duration: 0.01ms`.
2. **Seven targeted `animation: none` blocks** for everything staggered. These are
   not redundant. The global rule zeroes `animation-duration` but **not
   `animation-delay`**, and every stagger in this app uses `backwards` fill — so a
   `.picker__card` with a 176ms delay would sit at `opacity: 0` for 176ms before
   appearing. I checked all nine delayed animations; **all nine have a block.**
3. **A JS check** at `App.tsx:73` that skips the launch overlay entirely.

`pulse`'s two users need no block because the global rule sets
`animation-iteration-count: 1`. Coverage is complete.

### One existing defect

`src/games/Home.tsx:300-345` — `pickForMe` waits `RING_MS` (603ms) and then
`REVEAL_MS` (240ms) as plain `setTimeout`s, with **no reduced-motion check**, while
`games.css:677` freezes the very ring those 603ms exist to display. `App.tsx:73`
does check, for the launch overlay; this path does not. Under reduced motion,
"Pick a game for me" is ~850ms of a dead button reading "Picking…", plus a
`behavior: "smooth"` scroll that should be `"auto"`.

This is a genuine `prefers-reduced-motion` bug and I have put it first in the
commit plan.

### Would any proposal here need reduced-motion handling?

Findings **B**, **D**, **E**, **I**, **L**, **Q** and the mode-exit would each need
a targeted block — B and D because they stagger, E and I because they delay, L, Q
and the exit because a fill would hold a wrong state. Findings **F**, **G**, **M**
and **O** are pure transitions and are covered by the global nuke alone.

---

## 3. Findings

Tiered as requested. Tier 3 is long and I have not moved anything up to pad the
first two.

### Tier 1 — feels broken without it

**None.**

I looked for this and did not find it. Every screen in the app arrives with
motion, every card turns over, every control answers a touch, both timers pulse,
and the two hardest transitions in the app — a mode opening, and Letter Rip's board
appearing where an intro card was — are the two most carefully built. There is no
surface where the absence of motion makes something unreadable, ambiguous about
what changed, or unresponsive to a press. Reporting Tier 1 as empty is the honest
answer.

The closest candidates are **M** (a verdict blinking in beside a card that is
mid-flip) and **F** (a control with no press at all), and both are Tier 2:
annoying, cheap, not broken.

---

### Tier 2 — materially improves perceived quality

#### M. Ride the Bus's verdict blinks in and out

- **Surface**: score / state change
- **File**: `src/styles/games.css:941-948`
- **Should match**: `.roster__clear[data-hidden]` at `games.css:1555-1569` — the
  app's existing pattern for a `visibility`-reserved element, fading and scaling
  to 0.92 rather than blinking, with `visibility 0s` on the way in and
  `visibility 0s var(--dur-base)` on the way out so it never interpolates.
- **Diff**: ~10 lines, CSS only. The `data-hidden` attribute already exists in
  `RideTheBus.tsx:243`.
- **Why it is the best-value finding here**: a documented, working primitive
  exists for exactly this shape, and a second element with the identical shape is
  not using it. The verdict is also the only thing on that screen telling you
  whether you were right, and it currently appears in one frame beside a card that
  is taking 460ms to flip in.

#### F. The settings sheet's close button has no press feedback at all

- **Surface**: button / tap feedback
- **File**: `src/styles/games.css:89-102`
- **Should match**: the icon-sized press — `--press-scale-sm` + `--press-dim` —
  exactly as `.gheader__back` (`global.css:373`) and `.roster__chip`
  (`games.css:1639`).
- **Diff**: 4 lines, CSS only.
- **Note**: this is the only control in the app with a dead press. It is the
  clearest argument for finding **H**.

#### E. Most Likely To's verdict lands with the card instead of behind it

- **Surface**: card / prompt change, and state change
- **File**: `src/styles/games.css:2675-2685`
- **Should match**: `.kc__below` at `games.css:1910-1919` —
  `animation: pop var(--dur-base) var(--ease-out) 300ms backwards`, whose comment
  is precisely this argument: "the card, then what it costs you."
- **Diff**: ~8 lines CSS (including a reduced-motion block).
- **Detail**: going `counting → pointed` swaps `Countdown` for `PromptCard`, which
  is a type change, so the card remounts and re-flips. `.mlt__verdict` and the
  `.actions` block beneath it are the only things on the screen that appear in one
  frame.

#### B. Rank It's list does not deal

- **Surface**: card / prompt enter, and level navigation
- **File**: `src/styles/games.css:2724-2727` (`.slot > .rank__list`),
  `src/games/RankIt.tsx:186-207`
- **Should match**: `picker-deal` at `games.css:2472-2479` with the clamped `--i`
  stagger — **not** `card-flip-in`. These rows are a page of tappable options, which
  is what `picker-deal` is for; they are not a card, which is why `.slot > .card`
  correctly does not reach them.
- **Diff**: ~14 lines — one CSS rule + keyframe reuse + a reduced-motion block, plus
  one inline `--i` in `RankIt.tsx`.
- **Detail**: this list occupies the card's exact rectangle (`position: absolute;
  inset: 0` inside `.slot`), so it is in the most card-shaped slot in the app and is
  the only thing that lands there without motion.

#### C. Rank It's ranking → guessing handover has no motion

- **Surface**: level / step navigation
- **File**: `src/games/RankIt.tsx:186` — the
  `(phase === "ranking" || phase === "guessing")` block
- **Should match**: `SayTheSameThing.tsx:152`, which keys its bare card on four
  things *including phase*, for exactly this reason ("KEYED, or the card never
  turns over").
- **Diff**: **1 line** — `key={phase}` on the `<ol>`. Depends on **B**; with B
  landed, the deal replays for free.
- **Detail**: the same `<ol>` element serves two different people back to back.
  Positions clear and the header note changes from "X — privately" to "Everyone
  else"; nothing else moves. It is the one screen in the app where two players use
  identical UI in sequence.

#### L. Ride the Bus's streak never arrives — **HELD. Reversed during implementation.**

- **Surface**: score / counter change
- **File**: `src/styles/games.css:927` (`.rtb__tally`), `src/games/RideTheBus.tsx:167-177`

**I no longer recommend this, and the reason only became visible once
finding M had landed.**

The original argument was that `Streak` is what the player is chasing and the
only feedback for a correct call besides the verdict line. Two things undercut it:

1. **The verdict already says it, in words, every time.** `RideTheBus.tsx:141-143`
   builds the bus verdict as `` `${streak} in a row. ${BUS_TARGET - streak} to go.` ``
   on a correct call and `"Wrong. Drink, streak resets."` on a wrong one. The
   header's streak number is not additional information at the moment it changes —
   it is the same fact, restated.
2. **Finding M now animates that sentence.** As of `34fd053` the verdict fades in
   at `--dur-fast` directly under the four cards. Animating the header streak would
   announce the same fact a second time, 160ms later, in a competing part of the
   screen — pulling the eye up to the status strip and away from the line that just
   arrived under the thing it is a verdict on.

There is also a mechanical objection. `guessBus` sets `streak` and `verdict` in one
update, so the two animations would start in the same frame on different durations,
in different regions. That is the failure `roster-chip-in`'s comment
(`games.css:1676`) is an account of: "Three disagreements in one 260ms window, which
is all 'choppy' ever is."

**Recommendation: leave `.rtb__tally` alone entirely**, `Drinks` and `Streak` both.
Downgraded from Tier 2 to Tier 3. Recorded rather than deleted so it is not
re-proposed.

#### Q. The settings sheet arrives on a spring and leaves on a cut

- **Surface**: modal / sheet presentation
- **Files**: `src/components/Settings.tsx:47`, `src/games/Home.tsx:516`
  (`{settingsOpen && <SettingsSheet …/>}`), `src/styles/games.css:65-77`,
  `src/styles/global.css:1240-1258`
- **Should match**: the timed-exit idiom, verbatim —
  `GameHeader.tsx:98-120` (`LEAVE_MS`) and `LastWord.tsx:26-92`
  (`BOARD_LEAVE_MS`), both of which document why the hold must be a timeout and
  not `animationend`. The CSS side can reuse `fade-in` / `modal-in` in
  `reverse forwards`, which `.focal.lw[data-leaving] .actions` already does at
  `games.css:1229`.
- **Diff**: ~20 lines TSX (a `leaving` state and a timeout, or hoisting the flag
  into `Home`) + ~14 lines CSS.
- **Also covers**: `.modal` / `.modal-backdrop` in `global.css`, which have the
  same entrance and the same missing exit. No caller currently uses `.modal` —
  only `.sheet` — so this is one component's worth of work.

#### Mode exit is not the reverse of mode entry

- **Surface**: mode entry / exit
- **Files**: `src/App.tsx:39` (`goHome`), `src/App.tsx:76-110` (the launch effect)
- **Should match**: the launch overlay's own `clip-path` animation, run in reverse —
  or, if that is judged too slow (see counter-indications), a `--dur-fast` fade of
  the overlay, which is what `live-out` already does for a much smaller thing.
- **Diff**: ~50 lines in `App.tsx`. This is the largest and least certain item in
  the report.
- **Detail**: entry is a bespoke 520ms `clip-path` expansion from the tapped card's
  rect, with the screen swap deliberately hidden underneath it. Exit is
  `setScreen(null)`; Home remounts and plays the generic `screen-in` (fade + 10px,
  260ms) while the pack colour disappears in one frame.
- **Complication**: the rect to contract *to* is not known at exit time — Home is
  unmounted and the deck may have been scrolled. Storing the launch rect and
  contracting to it is one answer; a plain fade is the other and is 15 lines rather
  than 50.
- **See counter-indications before implementing.** I would take the fade.

#### Home's pick-for-me ignores `prefers-reduced-motion`

- **Surface**: mode entry
- **File**: `src/games/Home.tsx:300-345`
- **Should match**: `App.tsx:73`, which reads the same media query for the same
  kind of decision.
- **Diff**: ~8 lines — read the query, collapse `RING_MS` and `REVEAL_MS` to 0, and
  switch `scrollIntoView` to `behavior: "auto"`.
- **Detail**: covered in full in section 2. This is a defect, not an enhancement,
  and it is first in the commit plan.

---

### Tier 3 — technically absent, acceptable as-is

Long, as expected. I have marked the handful I would actually take, and said
plainly where I think the right answer is to leave it alone.

#### O. Rank It's position well fills with no transition — *worth taking*

`games.css:2806`. `.rank__item` transitions only `transform` and `opacity`, so the
`background` and `color` change on `.rank__pos` is a hard cut underneath the press.
`.votepad__player` (`games.css:1753`) transitions both at `--dur-fast` for the
identical select-a-thing interaction. **2 lines.** Cheap enough to fold into a
commit; genuinely invisible if it never happens.

#### D. Kings Cup's rules rows do not deal — *worth taking*

`games.css:2187` (`.kc-rules__row`). The screen "borrows the category picker's
shell wholesale" by its own comment, but not the picker's `picker-deal`. Thirteen
rows land in one frame where the picker's cards stagger. **~10 lines** — CSS plus
an inline `--i` in `KingsCup.tsx:158`. **Do not remove
`.kc-rules .pcard { animation: none }`** at `games.css:2204`: that rule is
deliberate and correct, and this proposal animates the *row*, not the card.

#### G. The segmented control has no press

`games.css:130-144`. It transitions `background` and `color` on `[data-on]`, which
is real feedback for the meaningful case. Tapping the option that is *already*
selected produces nothing. 4 lines if taken.

#### H. The press recipe is copied across eighteen selectors

Not a visual defect; a maintenance one, and the direct cause of **F**. A
`.pressable` / `.pressable--sm` pair of rules, adopted incrementally, would collapse
it. **Do not rewrite all eighteen in one commit** — it is a large mechanical diff
across two stylesheets with no user-visible change, and it should land after the
findings that do have one.

#### I. The Number Game's bid changes as a silent text substitution — *hold*

`games.css:2838`, `NumberGame.tsx:210`. `.num__bid-n` is the largest thing on the
card and the entire point of the bidding phase, and it goes 3 → 4 → 5 with no
motion. The card correctly does not re-flip ("updating a card in place, like raising
a bid, is not a new card" — `global.css:940`). `beat` at `games.css:2617` is the
app's existing "a numeral just changed" animation and would replay off a
`key={bid}`.

**I am not recommending this, and it is the one finding I would push back on.**
Raising is the highest-frequency action in the app — a table raises ten to fifteen
times a round, one tap apart. `beat`'s 640ms and 1.6× overshoot would be
intolerable by the tenth raise and would fight the `tabular-nums` stability the
number needs to be read across a table. If it is done at all it should be a ~120ms
scale from 1.08 with no opacity change, which is a different animation than the one
that already exists. Flagging it as a decision, not proposing a diff.

#### K. `.counter` updates silently — *leave it*

`global.css:1231`. "12 of 56" changes on every draw in Drink If and Last Call. It
is deliberately the quietest thing on the screen at `opacity: 0.7`; animating it
would promote it above the card it sits under. Also updates on the highest-frequency
action in the app.

#### The live line changes in place — *leave it, deliberately*

`GameHeader.tsx:127`, `global.css:462`. `live-in` fires on mount only, so every
in-place update swaps text silently: Hot Seat's `2 of 4`, Ride the Bus's round
label, Imposter's `Reveal 2 of 5`, Say the Same Thing's `Attempt 3`.

This is a **closed decision, not a gap.** `GameHeader.tsx:37-84` is a long account
of what happened the last time this line was animated on a change — a FLIP that
stalled on frame one and parked the category behind the letter grid for a whole
round. The line is also the one thing a player must carry across a pass-the-phone
handoff. Re-animating it would re-open that.

#### T. Imposter's Random changes the category on the live line

`Imposter.tsx:196-202`. Pressing Random rewrites `Category:\nAny` → `Category:\nFilms`
in the header, silently. Letter Rip solves the same problem by sending Random back
to the **intro**, "where the category is a card" — a documented product decision at
`LastWord.tsx:134-146`. The motion fix here would be a `GameHeader` change affecting
every mode's live line, which is the thing the entry above says not to do. **The
right fix is Letter Rip's, and it is a product change, out of scope for this audit.**
Flagged, not proposed.

#### R. The category picker and Kings Cup rules screens have no exit

Same shape as **Q**, but these are navigations inside one `.screen` rather than
presentations over it, and both land on a screen that has its own motion. Lower
value than Q for more work.

#### A. Cards never exit

`PromptCard.tsx:15-20` states this as a design decision: the outgoing card is
destroyed the frame the new one mounts, and the flip covers it because the new card
starts back-on. Correct as-is. Listed only so the report is complete.

#### `.kc__left`, `.rtb__tally`'s `Drinks`, `.rank__rule`

Three more silent counters. All quiet, all secondary to something that does move.
Leave.

#### `LEAVE_MS` / `BOARD_LEAVE_MS` hold under reduced motion

160ms and 180ms of a still element after its animation has been nuked to 0.01ms.
Harmless — and shortening them under reduced motion would just make the exit a cut,
which is the correct behaviour anyway.

#### Unused tokens

`--dur-instant` and `--dur-wheel` are defined in `tokens.css:270`, `:274` and
referenced nowhere. `--dur-wheel` (4200ms) is a leftover from a spinner that is not
in the tree. Deleting `--dur-wheel` is safe; `--dur-instant` is a plausible slot for
finding **I**'s short scale if that is ever taken.

---

### Surfaces with no findings

**Loading and empty states — nothing to fix, and I want to be explicit about why.**

- There are **no loading states**. Every pool is a static import (`src/data/*.ts`),
  the deck is synchronous (`src/lib/deck.ts`), and there is no network call anywhere
  in the app — the README's tagline is "No wifi. Just play." A spinner here would be
  motion with nothing behind it.
- **Empty state is one string** — `"No cards in this deck."` in `DeckGame.tsx:88`,
  `LastCallGame.tsx:172`, `MostLikelyTo.tsx:75`, `HotSeat.tsx:172` — and it already
  arrives on `card-flip-in`, because it renders inside the card.
- The nearest thing to a loading state is Home's "Picking…", and it is the most
  heavily animated thing in the codebase.

**Card enter/change, and level navigation, are largely complete.** Imposter's
cover ⇄ role ⇄ ready, Hot Seat's four questions, Last Call's tier crossing, Ride
the Bus's four rounds, the Number Game's count → bidding, and every Letter Rip
transition all remount a card and flip it. The gaps are B, C, D and E above and
nothing else.

---

## 4. Counter-indications

Places where adding motion would make the app worse. Each of these is a reason to
*not* do something, and two of them constrain findings above.

### Pass-the-phone handoffs — do not add duration

The phone physically changes hands at: Imposter's cover → role → cover, once per
player per round; Hot Seat's rotate, every four questions; Rank It's ranking →
guessing; Ride the Bus's results → next rider; Letter Rip's every turn. **Each of
these already costs `--dur-slow` (460ms) for the card flip.** The person receiving
the phone is waiting on it.

Consequences for this report:
- Finding **A** (card exits) stays declined. An exit animation would stack on top
  of the 460ms flip at every one of these points.
- The **mode exit** finding should take the short form. Closing a mode is usually a
  reflex press on the X — someone wants out — and 520ms is exactly the wrong place
  to spend it. A `--dur-fast` fade, or nothing.
- Finding **C** is safe because it costs nothing extra: it reuses a deal that would
  otherwise not run at all.

### High-frequency repeated actions — animation fatigue by round ten

Ranked by taps per round:

| Action | Taps/round | Status |
|---|---|---|
| `.lw__letter` | up to 20, plus the bank re-dealing | Already tuned for this — 10ms × 20, "a beat, not a queue" (`games.css:1182`). Add nothing. |
| Number Game raise | 10–15, one tap apart | **This is why finding I is held.** |
| `deck.draw()` (Drink If, Last Call, Most Likely To) | continuous — it *is* the primary action | The 460ms flip is the whole product. Add nothing before or after it. |
| `.rank__item` | 5, twice per round | Finding **O**'s 2-line `--dur-fast` transition is fine. A per-row entrance on every tap would not be. |
| `.counter`, `.rtb__tally` | updates on every one of the above | Findings **K** and **L**'s `Drinks` half stay declined for this reason. |

### `prefers-reduced-motion`

- **Anything staggered or delayed must get its own `animation: none` block.** The
  global nuke at `global.css:1279` zeroes `animation-duration` but **not
  `animation-delay`**, and every stagger in this app uses `backwards` fill. Without a
  block, a delayed element sits at its from-state — often `opacity: 0` — for the
  full delay. Findings **B**, **D**, **E**, **I**, **L**, **Q** and the mode exit each
  need one.
- **Gameplay timing must never be reduced.** `Countdown`'s `BEAT_MS` (700) and
  `ACTION_MS` (1100), Letter Rip's `TURN_SECONDS` (10), the Number Game's
  `SECONDS_PER_ITEM` (6). These are the rules of the game, not decoration. A
  reduced-motion user who gets a 3-2-1 count-in at 0.01ms per beat has been handed a
  broken game, not an accessible one. Nothing in this report touches them.
- **The one thing that *should* be reduced and is not** is Home's pick-for-me — see
  section 2. It is the reverse failure: 850ms of JS-scheduled waiting for a flourish
  the stylesheet has already frozen.

### One place motion is correctly absent already

`.kc-rules .pcard { animation: none }` at `games.css:2204`: "Thirteen cards turning
over at once while you are trying to read them is noise, not motion." Finding **D**
animates the row and must leave this rule alone.

---

## 5. New tokens, flagged separately

Per the brief, none of these are folded into a fix.

### Recommended: none for the stagger steps

The literal stagger values are `30ms` (`games.css:245`), `22ms` (`:2473`), `10ms`
(`:1185`) and `45ms` (`:2875`). It is tempting to collapse them into a
`--stagger-step`. **I recommend against it.** Each has its own written reasoning
about its own item count — twenty tiles versus eleven cards versus eight clamped
cards versus seven rows — and a single token would flatten four reasoned decisions
into one number that is wrong for at least three of them. The `--i` convention is
already the shared part; the step is correctly local.

### Two literals that should reference existing tokens — a fix, not a new token

- `games.css:1191` — `.focal.lw .actions { animation: pop var(--dur-base) var(--ease-out) 260ms backwards }`.
  The `260ms` **is** `--dur-base`, written as a number.
- `games.css:1918` — `.kc__below { … 300ms backwards }`, whose comment says it is
  "most of `--dur-slow`".

Both could reference the tokens they are standing in for. Small, and it belongs in
whichever commit touches those files.

### The one genuine token addition — only if the mode exit is taken

`LAUNCH_MS = 520` and `LAUNCH_EASE = "cubic-bezier(0.32, 0.72, 0, 1)"` at
`src/App.tsx:32-33` are the only motion values in the app living outside
`tokens.css`. An exit animation would need the same two, and duplicating them in a
second place is how they drift.

**Proposed**: `--dur-launch: 520ms` and `--ease-launch: cubic-bezier(0.32, 0.72, 0, 1)`
in `tokens.css`, read into `App.tsx` via `getComputedStyle` or simply kept as the
single source of truth for the CSS side. This is **a prerequisite commit** for the
mode-exit work, not part of it — and if the mode exit is declined, this token is not
needed and should not be added.

---

## 6. Phased commit plan

One logical change per commit, grouped by surface. Phases are ordered by
confidence and risk: everything in Phase 1 and 2 is CSS-only or near it.

### Phase 1 — the defect, and the press  ✅ landed

| # | Commit | Files | Size | Finding |
|---|---|---|---|---|
| 1 | Skip the pick-for-me beats under reduced motion | `games/Home.tsx` | ~8 lines | *(§2 defect)* |
| 2 | Give the settings sheet's close button the press every other control has | `styles/games.css` | 4 lines | **F** |
| 3 | Press feedback on the segmented control | `styles/games.css` | 4 lines | **G** |

### Phase 2 — state changes that should not blink  ✅ landed (one item reversed)

| # | Commit | Files | Size | Finding |
|---|---|---|---|---|
| 4 | Fade Ride the Bus's verdict in and out, the way Clear already does | `styles/games.css` | ~10 lines | **M** |
| 5 | Transition Rank It's position well like the player picker's | `styles/games.css` | 2 lines | **O** |
| 6 | Land Most Likely To's verdict behind the card, not with it | `styles/games.css` | ~8 lines | **E** |
| 7 | Let Ride the Bus's streak arrive | `styles/games.css`, `games/RideTheBus.tsx` | ~8 lines | **L** |

### Phase 3 — Rank It deals  ✅ landed

Two dependent changes on one surface; 9 is meaningless without 8.

| # | Commit | Files | Size | Finding |
|---|---|---|---|---|
| 8+9 | Deal Rank It's list, and deal it again when the phone changes hands | `styles/games.css`, `games/RankIt.tsx` | ~55 lines | **B** + **C** |

**Landed as one commit** (`c805c78`), not two. **C** is a no-op on its own — `key={phase}`
remounts the list, but nothing animates on mount until **B** gives it an entrance.
Splitting them would have put a commit on the branch that changed nothing observable.

### Phase 4 — presentation exits  ✅ landed

| # | Commit | Files | Size | Finding |
|---|---|---|---|---|
| 10 | Let the settings sheet leave | `components/Settings.tsx`, `styles/games.css`, `styles/global.css` | ~34 lines | **Q** |
| 11 | *(only if 12 is approved)* Move the launch timing into tokens.css | `styles/tokens.css`, `App.tsx` | ~10 lines | *(§5)* |
| 12 | Close a mode the way it opened | `App.tsx` | ~15 lines (fade) or ~50 (reverse clip-path) | *(§3)* |

**12 needs a decision from you before I write it** — see the counter-indications.
My recommendation is the fade.

### Shipped: the close contracts back into the Home card

Parked once, then built. The final shape is two movements that do not overlap:

| | |
|---|---|
| **0–320ms** | the colour contracts onto the card, which Home is holding RAISED out of the stack, and clears as it lands |
| **320ms** | the raised card is simply there — name, tagline, its own border — with nothing over it |
| **320ms+** | it lowers into the slot, `--dur-base` on `--ease-glide`, and that is all that happens |

The rect is **measured, not remembered**: Home mounts under the opaque overlay,
so the real card is in the real DOM before anything is visible. Three
corrections were needed and all three were found by measuring — the card's
drift under `screen-in`, the 37px of it tucked behind its neighbour, and its
corners.

**Everything that finally worked was a removal.** The list is worth keeping,
because each item was originally added to fix a symptom:

- **The drawn stroke.** Pinned to the landing rect, so it floats whenever the
  clip is larger than that rect. The card's own 2px border cannot float,
  because it is not pinned to anything.
- **The gradient veil.** Real work — it was hiding the sharp corners — but it
  brought the close to six overlapping timelines on four easing curves. Frame
  timing was clean throughout, so "choppy" was never dropped frames.
- **Squaring the corners.** Contracting to the card's own `28px 28px 0 0` was
  the obvious thing and was wrong; nothing needs to square off because the
  bottom edge is clamped to where the next card covers this one.
- **Hiding the writing.** Redundant — the overlay already covers it — and
  holding it at zero meant it could only ever arrive *during* the drop, which
  is what made the two halves read as one blurred event.
- **The second timer.** App retired the overlay and Home dropped the card on
  two clocks aimed at the same instant. One signal now.
- **`painted = screen ?? closing`.** Correct for the fade it was written for,
  wrong for the contraction — it pinned mode colour above a white Home.

Two things that were *not* removals, and both were bugs rather than taste:

- The drop had no transition of its own, so it inherited `.deck-card`'s —
  `var(--dur-press)`, the **button press**. It covered 14px in ~90ms and then
  sat there. It has its own state and a settle curve now.
- The ghost during the fade is a cross-fade artifact, not a smear: while the
  colour is part-transparent it sits exactly on the card, so the card's own
  white text reads grey through it. Fixed by spending less time in the middle
  — window 120ms → 55ms, and weighted to the end rather than linear. Time
  below 80% opaque: ~96ms → ~9ms.

**The lesson, which is the reusable part:** every round where I added a layer
to answer a piece of visual feedback made it worse, and every round where I
took one away made it better. Before adding anything to this animation, count
the clocks already running on it.

### Phase 5 — optional, lower value  ✅ item 13 landed; item 14 deferred

| # | Commit | Files | Size | Finding |
|---|---|---|---|---|
| 13 | ✅ `b3add42` Deal the Kings Cup rules rows | `styles/games.css`, `games/KingsCup.tsx` | ~45 lines | **D** |
| 14 | ⏸ Collapse the press recipe into a shared class | `styles/global.css`, `styles/games.css`, ~10 TSX | large, mechanical | **H** |

**Item 14 is the one outstanding item in this whole plan**, deferred by D3 and not
attempted. D3's stated blocker — that it must not be mixed with behaviour changes —
no longer applies now that every behaviour change is landed, so it could now be done
as the isolated commit D3 described.

Worth knowing before it is: the eighteen presses are **not** uniform, so this is not
a find-and-replace. Fifteen collapse cleanly into two groups. **Three cannot**, and
one of those three will not announce itself.

- `--press-scale` + `--press-dim` (9): `.btn`, `.chip`, `.pick-me`, `.picker__card`,
  `.rank__item`, `.roster__prompt`, `.roster__clear`, `.roster__go`,
  `.votepad__player`
- `--press-scale-sm` + `--press-dim` (6): `.gheader__back`, `.gfoot__skip`,
  `.roster__chip`, `.settings-btn`, `.sheet__close`, `.stepper__step`

`.settings-btn` was a fifth exception until its `rotate(35deg)` came off. The gear
turning on press mimed what the button does, and that was the whole argument for it
— but one control moving differently from every other one reads as a glitch rather
than as wit, so it now takes the plain small press like the rest of its group.

The three exceptions, each for a written reason:

1. **`.deck-card`** — `translateY(-4px)`, no scale and no dim. The cards overlap, so
   a scale slides one under its neighbour, and a card that dims as it comes toward
   you reads backwards.
2. **`.segmented__opt`** — scale, no dim. Dimming the pressed option fights the fill
   that carries the control's state, and on the already-selected option it reads as
   the setting being switched off.
3. **`.lw__letter` — the one that will bite.** At phone size it is a plain
   `scale()`. At the tablet ring breakpoint the letters are placed by a `--place`
   transform and the press *composes* with it:
   `transform: var(--place) scale(var(--press-scale))`. A shared class setting
   `transform: scale(...)` **overwrites the placement and collapses all twenty
   letters onto the centre of the board on every tap** — and only above
   `min-width: 640px and min-height: 950px`, so it is invisible at the size anyone
   would check first. This is the same trap `lw-key-in` documents for its own
   animation, which is why that one animates the `scale` property rather than
   `transform`.

So a shared pair of classes covers fifteen, and three keep bespoke rules with their
reasoning intact. A real simplification, not a total one.

**The eight reduced-motion blocks are a different question, and my recommendation
there is to leave them distributed.** They are not duplication — each names
different selectors, and they exist because the global nuke zeroes
`animation-duration` but not `animation-delay`. Collecting them into one block would
move each rule away from the animation it disables, and in this codebase every
animation has its reasoning written beside it. Consolidating would cost that.

### What Phase 4 actually cost

| # | Commit | Files | Finding |
|---|---|---|---|
| 10 | `2310428` Let the settings sheet leave | `components/Settings.tsx`, `styles/games.css`, `styles/global.css` | **Q** |
| 11 | — *not needed* | — | see D1 |
| 12 | `da90be0` Close a mode the way it opened, only faster | `App.tsx`, `styles/games.css` | mode exit |

**Commit 11 was dropped.** D1 chose a fade over a reversed clip-path, and a fade
does not reuse the launch curve — so `--dur-launch` / `--ease-launch` were never
needed. `LAUNCH_MS` and `LAUNCH_EASE` stay in `App.tsx` as the entrance's own
values, and **no motion token was added by any of this work.**

### One thing the plan got wrong: `reverse` does not undo an easing curve

Both exits were first written as the entrance played `reverse`, on the argument
that one set of keyframes cannot drift out of step with itself — the form
`.focal.lw[data-leaving] .actions` already uses.

That is fine for opacity and **wrong the moment there is distance to cover.**
`animation-direction: reverse` mirrors the *timing function* as well as the
keyframes, and `--ease-out` is ~95% done by its halfway point — which mirrored is
~5% done by halfway. Scrubbed at 40ms intervals, the sheet moved 0.04px, 0.5px and
3.1px of its 18, then the remaining 15 in the last quarter. It hung, then vanished.

Rewritten as `modal-out` / `fade-out` played forward it travels 14.9px in the first
40ms. This is why `lw-ring-out` and `lw-key-out` restate their scales rather than
reversing the entrances they mirror — a detail whose reason was not obvious until
something else needed it.

**Rule for anything added later: an exit that only moves opacity may reverse its
entrance. An exit that travels needs its own keyframe, played forward.**

### Held pending a decision

- **Finding I** (the Number Game's bid). I recommend against it as specified, and
  would want to agree the shorter form before writing anything.
- **Finding T** (Imposter's Random). Product change, not motion. Out of scope.

---

## 7. Working-tree note — resolved

`src/styles/games.css` carried two uncommitted changes while this audit was
written. Both have since landed on `main` as their own commits and the working
tree is clean:

- `6733211` — the `deck-deal` rewrite (opacity/scale dropped; each card starts one
  `--peek` low and slides out from under its neighbour).
- `1e02c3e` — `live-drop` measured rather than guessed at 48px, adding a
  `--gheader-now-floor` token.

The `/* TEMP-SLOWMO — remove */` debug override is gone. Nothing from that work is
bundled into any commit in the plan below.

Both commits shifted line numbers in `global.css` and `games.css` by roughly 17–18.
No finding in this report changed; references below are against the post-`1e02c3e`
tree.

---

## 8. Decisions taken

Recorded 2026-08-19. These are settled; they are written down here so they are not
re-proposed by a later pass.

### D1 — Mode exit: a `--dur-fast` fade. **Approved.**

Not the reversed clip-path. Closing a mode is a reflex escape press, and the card
flip already spends `--dur-slow` (460ms) at every pass-the-phone handoff; the way
out is not where more duration should go. ~15 lines in `App.tsx`, Phase 4.

This also settles the token question in [§5](#5-new-tokens-flagged-separately): a
fade does not need `--dur-launch` / `--ease-launch`, because it does not reuse the
launch curve. **No new token is required.** `LAUNCH_MS` / `LAUNCH_EASE` stay in
`App.tsx` as the entrance's own values.

### D2 — The Number Game's bid: **silent. Declined, with reason.**

No scale, no pulse, no `beat`. Ten to fifteen sequential raises a round, one tap
apart, means any motion on that numeral is noise by round ten, and it would fight
the `tabular-nums` stability the number needs to be read across a table.

Finding **I** stays in [§3](#i-the-number-games-bid-changes-as-a-silent-text-substitution--hold)
as a declined finding rather than being deleted, so the gap is on record as a
decision rather than an oversight.

### D3 — Press-recipe and reduced-motion consolidation: **deferred, not declined.**

Findings **H** (eighteen duplicated press recipes) and the eight separate
`prefers-reduced-motion` blocks are out of scope for this work. Consolidating them
is a mechanical refactor across two stylesheets with its own regression risk, and it
must not be mixed with behaviour changes. It stays available as its own piece of
work.

Consequence for anything below: **new rules follow the existing convention.** A new
press writes the recipe out in full like the other eighteen; a new staggered or
delayed animation gets its own reduced-motion block. Do not start a shared class
partway through.

### D4 — Tier 2 ordering

`.rtb__verdict` (**M**) first, then `.sheet__close` (**F**), then Rank It's `<ol>`
phase key (**C**). The rest of Tier 2 follows those three.

### D5 — The reduced-motion defect goes in Phase 1

`Home.tsx`'s pick-for-me timeouts. It is the only genuine bug in this report and it
hits accessibility, so it leads. **Gate it on the same check `App.tsx:73` already
uses** — read the media query, do not introduce a second mechanism for the same
question.
