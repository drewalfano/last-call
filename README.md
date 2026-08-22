# Last Call

Offline pass-the-phone party game. Eleven modes, one home screen, no accounts,
no network, no ads.

```bash
npm install
npm run dev      # dev server (add -- --host to reach it from a phone)
npm run build    # production build + service worker
npm run preview  # serve the build (needed to exercise the PWA)
```

> The service worker only exists in a production build. `npm run dev` will not
> register one — test offline against `npm run build && npm run preview`.

## Deploying (GitHub Pages)

Static files over HTTPS is all this app needs. `.github/workflows/deploy.yml`
builds and publishes on every push to `main`. One-time setup: push the repo,
then **Settings → Pages → Source: GitHub Actions**.

**Base path matters.** A service worker can only control the path it is served
from, so the build's `base` and the manifest's `start_url`/`scope` have to
match where the site actually lives.

| Deploy target | URL | `VITE_BASE` |
|---|---|---|
| Project page (default) | `user.github.io/last-call/` | `/last-call/` — set automatically from the repo name |
| User page or custom domain | `lastcall.app` | set a repo Actions variable `VITE_BASE` to `/` |

A Pages site is publicly reachable by anyone with the URL, 19+ content
included. Pages from a private repo requires a paid GitHub plan.

---

## Architecture

```
src/
├── App.tsx              screen state machine + the launch animation overlay
├── main.tsx             entry, providers, service worker registration
├── styles/
│   ├── tokens.css       ← EVERY color, font, radius, space, easing value
│   ├── games.css        per-mode layout (structure only)
│   └── global.css       reset, app shell, cards, buttons, modal
├── state/
│   ├── theme.tsx        dark / light / device
│   ├── contentMode.tsx  Safe / 19+
│   └── roster.tsx       who's playing (optional)
├── data/                content only — no component logic
├── lib/                 deck shuffling, 52-card deck, prompt tokens
├── components/          shared UI
└── games/               Home + one file per mode
```

**Navigation is a state machine, not a router.** Nav is flat and one level
deep, and nobody deep-links a prompt mid-party.

**Game state is not persisted.** Only settings and the roster survive a
refresh. Leaving a mode ends the round.

---

## Design principle: the app deals, the table decides

The app runs what a group genuinely can't — shuffling, secret roles, timers,
a 52-card deck. It deliberately does **not** adjudicate what players are
better at settling themselves:

- **Letter Rip** has no answer validation. The table challenges a bad answer,
  exactly like the physical game it's based on.
- **Kings Cup** tracks only mate pairings. Thumb Master, Question Master and
  house rules are *not* displayed — showing them hands the answer to whoever
  forgot, which is the moment those rules exist to catch.
- **Odd One Out** has no ballot, no reveal and no score.

Reach for this principle before adding anything that keeps score.

---

## The eleven modes

Listed in the order Home deals them, which is `MODES` in `src/data/modes.ts` —
the single source for titles, taglines and pack colours. Highest-replay modes
sit at the top, because eleven cards scroll past a single screen.

| # | Mode | Type |
|---|---|---|
| 1 | Last Call ★ | wildcard deck |
| 2 | Letter Rip | timer game |
| 3 | Odd One Out | social deduction |
| 4 | Rank It | ranking + guessing |
| 5 | Most Likely To | deck + pointing |
| 6 | Kings Cup | card game |
| 7 | Ride the Bus | card game |
| 8 | Same Page | timed convergence |
| 9 | Overbid | bidding + challenge |
| 10 | Drink If… | deck |
| 11 | Hot Seat | turn structure + voting |

**Ids are not titles.** Four modes were renamed and their ids deliberately were
not, because nothing a player sees is attached to them: Odd One Out is
`imposter`, Letter Rip is `last-word`, Same Page is `say-the-same-thing`,
Overbid is `the-number-game`. The same goes for their files, data exports and
`--cat-*` tokens. Renaming them would touch about thirty sites to change
nothing on screen.

Odd One Out is a rename of the MODE only. The role it deals is still called the
Imposter and the in-game copy still says so.

### Mode notes

- **Last Call** — cards carry a `kind` and an `intensity` of 1–3. The deck
  deals *all* of tier 1, then 2, then 3, so a round escalates. Tier balance is
  27/31/18 (Safe) and 19/17/20 (19+); keep it roughly even when adding cards
  or a round stalls in the warm-up.
- **Kings Cup** — classic ruleset, gendered ranks included, Drive at 9
  (vroom / skrrt / skeet). Rank 10 pulls a category from Letter Rip's pool and
  the Jack pulls from the Never Have I Ever pool. The ruleset is data in
  `src/data/kingsCup.ts`, one entry per rank.
- **Ride the Bus** — real 52-card deck. Ties lose. Wrong guesses cost 1/2/3/4
  by round; the bus needs four correct in a row.
- **Letter Rip** — the letter bank drops Q, U, V, X, Y, Z. The clock is
  deadline-based, so a backgrounded tab can't hand a player extra time.
- **Odd One Out** — one secret word, one player who never sees it. The mode was
  renamed; the ROLE it deals is still called the Imposter, and the in-game copy
  still says so, which is why the word appears below. Two things are
  load-bearing and easy to break:
  1. **A role is only ever on screen for the player it belongs to.** Every
     reveal is bracketed by a neutral cover screen, and the phase machine
     cannot go from one player's role straight to the next. The reveal order
     is shuffled, so position gives nothing away.
  2. **Both role cards are visually identical** — same white stock, size and
     eyebrow. Only the text colour differs. An inverted dark card would change
     how much light the screen throws and let someone across the table spot
     the Imposter without reading a word.
- **Rank It** — one player ranks a set privately, the table guesses the order,
  and the reveal slides each item from where the group put it to where the
  ranker did. How far a row travels is how wrong it was.
- **Same Page** — two players say a word at the same time, then keep saying
  the word between their two answers until they match. Prompts are worded as
  territory, never as a single instance: "Sports", not "A sport". The singular
  form asks for one item and leaves nowhere to converge.
- **Overbid** — bidding escalates until someone calls it, then the bidder gets
  a clock and has to produce what they claimed. Without a roster it asks how
  many are playing, so the bid has a table to go round; with names it uses
  those instead.
- **Hot Seat** — four questions per seat, split evenly between the seat
  answering and the table voting.

### Choosing a category

Letter Rip and Odd One Out share `CategoryPicker`. Three ways in, in order of
speed: the category already on screen, **Random** to redraw, and **All
categories** for a scrollable grid with **Write your own** pinned at the top.

**Odd One Out groups its words by category rather than listing them flat, and
that grouping is load-bearing.** A player browsing a list of *words* and
choosing one would know the secret word — and can still be dealt the Imposter,
which breaks the game outright. Choosing a *category* leaks only the theme,
which the first clue gives away anyway. Custom entry in Odd One Out *is* the word,
so it carries a note saying whoever types it will see it; that is left to the
table rather than blocked.

---

## Settings

Two independent settings behind the gear on Home. They used to be one control
— turning on adult content also turned the app dark — which made it impossible
to have either without the other.

### Content: Safe / 19+

One rating for the whole app; there are no per-game toggles. Switching
re-points every mode at the matching pool immediately.

- Default: Safe. Not badged — it's just the app.
- Persisted at `lastcall.contentMode`.
- Internal value is `"safe"` / `"night"`; `night` names the key every data file
  uses, while the UI says 19+.

### Appearance: Dark / Light / Device

- Default: Dark. This gets opened in bars.
- Device follows `prefers-color-scheme` and updates live.
- Persisted at `lastcall.theme` — the *preference*, including `device`. Storing
  the resolved value would freeze the choice the first time the phone changed.

---

## The roster

Optional, on Home. Nothing requires it: with names, prompts name people and
voting works; without one, every mode plays exactly as it would have.

Prompts can carry `{name}` (whose turn), `{other}` (a random other player) and
`{left}`. `fillPrompt()` in `src/lib/prompts.ts` resolves them and falls back
to generic wording — "someone else", "the person on your left". That single
fallback is why modes don't need two sets of copy. Resolution happens once per
card, not per render, so a name can't change mid-prompt.

Odd One Out degrades per player, so a three-name roster in a five-player game
reads "Drew, Sam, Alex, Player 4, Player 5".

---

## Content

Every pool is checked for duplicates — including across Safe and 19+, since
they are concatenated rather than swapped — and every card is drawn against the
fixed square card at the longest copy to confirm nothing clips.

| Pool | Safe | 19+ |
|---|---|---|
| Last Call | 76 *(27/31/18 by tier)* | 56 *(19/17/20)* |
| Odd One Out words | 140 *(14 categories)* | 60 *(6 categories)* |
| Letter Rip categories | 94 | 46 |
| Rank It sets | 24 | 16 |
| Most Likely To | 60 | 60 |
| Same Page prompts | 35 | 25 |
| Overbid categories | 40 | 26 |
| Drink If… | 60 | 60 |
| Hot Seat | 60 | 60 |
| Never Have I Ever *(Kings Cup's Jack)* | 60 | 60 |

The 19+ column is what that pool ADDS, not what it becomes — see the policy
below. A mode's real 19+ deck is both columns together.

Same Page filters on how OPEN a prompt is, not on how well it reads. Hundreds
of valid answers and no clause narrowing the field — players cluster on the
common ones by themselves, and several strong answers is a healthy prompt
rather than a broken one. What gets cut is the closed space: a qualifier that
leaves six answers, or a phrasing that asks for a joke. The rule is documented
at the top of `sayTheSameThing.ts`, along with the inverted version of it that
was applied once by mistake and withdrawn.

**Night policy** is per file, documented at the top of each, and every one of
them ADDS. The choice is settled by one question — does a player read this
list, or is it dealt blind?

| Policy | Used by | Behaviour |
|---|---|---|
| `lead` | Letter Rip, Odd One Out, Rank It, Same Page, Overbid | 19+ entries in front, safe ones interleaved through. The order matters because these are browsed in a picker; a straight concatenation puts a wall of one register at the top. |
| `supplement` | Last Call, Drink If…, Most Likely To, Hot Seat, Never Have I Ever | Safe + 19+. No claim about order — everything reading this shuffles. |

There is no policy that drops the safe pool. `replace` existed once, was the
default, and was removed outright — not merely left unused, because a third
option the project has decided against is one the next mode falls into by
accident. Nothing about a rowdy table makes "Countries" or a warm-up question
unsuitable, and a 19+ deck that threw the safe pool away halved the material on
the night the app gets used most.

**Both category games mix two kinds deliberately.** Plain categories anyone can
play cold — Countries, Colours, Girls' names, Animals — alongside bar-flavoured
ones with more bite — Things in a bar, Things that ruin a night out. A list of
only the second reads as a one-note game; a list of only the first reads as a
kids' car game. The 19+ pool then adds the genuinely raunchy options on top.

Adding content means editing `src/data/` only. Decks read pool length at
runtime, so counters, shuffling and reshuffle all adapt.

---

## Visual layer

`src/styles/tokens.css` is the single swap point — no component hard-codes a
hex, a px radius or an easing curve.

**Direction:** the pack colour floods the entire viewport once you enter a
mode. Home is near-black. A single square white card sits centred on it,
with the primary action grounded 20px off the bottom in every mode, so nothing
moves between prompts.

**Two neutrals app-wide:** flat white and `#141414`. Every pack colour ships
with the ink that sits on it, and all eleven clear WCAG AA against just those
two foregrounds. Ratios are the ones recorded beside each token in
`tokens.css`; the table below is in Home's dealing order.

| Mode | Token | Colour | Ink | Ratio |
|---|---|---|---|---|
| Last Call | `--cat-last-call` | `#E0070F` | white | 4.99 |
| Letter Rip | `--cat-last-word` | `#EE4620` | `#141414` | 4.85 |
| Odd One Out | `--cat-imposter` | `#CAC307` | `#141414` | 9.93 |
| Rank It | `--cat-rank-it` | `#A5C0EA` | `#141414` | 9.94 |
| Most Likely To | `--cat-most-likely-to` | `#E43E70` | `#141414` | 4.58 |
| Kings Cup | `--cat-kings-cup` | `#273287` | white | 11.10 |
| Ride the Bus | `--cat-ride-the-bus` | `#FFAE00` | `#141414` | 9.92 |
| Same Page | `--cat-say-the-same-thing` | `#0F4A42` | white | 10.10 |
| Overbid | `--cat-the-number-game` | `#E990A2` | `#141414` | 7.87 |
| Drink If… | `--cat-drink-if` | `#441B07` | white | 14.94 |
| Hot Seat | `--cat-hot-seat` | `#B9A3E3` | `#141414` | 8.26 |

The token column is there because the ids never changed: Odd One Out's colour
lives under `--cat-imposter`, and looking for `--cat-odd-one-out` finds nothing.
The table above had drifted a whole re-deal out of date — nine of the eleven
rows named the colour each game wore before the colours were dealt across the
slots — so it is rebuilt here from `tokens.css` with every ratio recomputed
rather than carried forward.

**The deal is currently broken.** Letter Rip's orange sits directly under Last
Call's red at an OKLab distance of 0.069, where the arrangement was built to
hold the weakest neighbouring pair at 0.295. See the note on the pack colours
in `tokens.css`.

### Card treatment

One animation for every card in the app: a full 180° `rotateY` with
`backface-visibility: hidden`, so the new card is literally on the back of the
one before it. Parents that host a card set `perspective`, or the flip renders
as a flat squash. Playing cards are keyed by their own identity so React
remounts them and the flip actually replays.

Home is a stack of overlapping cards. Tapping one expands its colour from that
card's rect to full screen via `clip-path` on the Web Animations API, and the
screen swap happens *underneath* the opaque overlay — that ordering is what
keeps the transition smooth.

### Cascade warning

`games.css` is imported **before** `global.css`, so a bare single-class rule in
`games.css` loses to one in `global.css` at equal specificity. This has bitten
three times. Qualify overrides: `.focal.kc`, `.card.imp-card--imposter`.

## Icons

`public/icon-*.png` are placeholders generated by a dependency-free script.
Replace them alongside the visual layer.
