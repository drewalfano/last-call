import { useCallback, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { PlayingCard } from "../components/PlayingCard";
import { fadeOnScroll } from "../lib/scrollFade";
import { PlayerPicker } from "../components/VotePad";
import { SUITS, deal, freshDeck, rankLabel, type Card } from "../lib/cards";
import { randomItem } from "../lib/deck";
import { resolvePool } from "../data/pools";
import { KINGS_CUP_RULES, RULE_BY_RANK, DRIVE_CALLS, type KingsCupRule } from "../data/kingsCup";
import { LAST_WORD_CATEGORIES } from "../data/lastWord";
import { NEVER_HAVE_I_EVER } from "../data/neverHaveIEver";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import type { ModeDef } from "../data/modes";

/**
 * KINGS CUP
 * Draw a card, the rank is the rule.
 *
 * The reason to play this on a phone rather than with a physical deck is the
 * bookkeeping: which rules are in play, who's Question Master, who's mated
 * to whom, and how many kings are gone. All of that is what a table actually
 * loses track of three rounds in.
 */

const TOTAL_KINGS = 4;

interface State {
  deck: Card[];
  card: Card | null;
  rule: KingsCupRule | null;
  /** Extra copy pulled for ranks that draw from a pool (10 and J). */
  extra: string | null;
  kings: number;
  /**
   * Mates are the only thing worth surfacing: a mate is a standing obligation
   * between two named people, not a rule the table is meant to be policing.
   *
   * Question Master and house rules are deliberately NOT tracked. Displaying
   * them hands the answer to whoever forgot, which is the exact moment those
   * rules exist to catch. The players keep each other honest; the app just
   * deals.
   */
  mates: [string, string][];
  /** The player the current card's pick landed on. */
  picked: string | null;
  finished: boolean;
}

function initialState(): State {
  return {
    deck: freshDeck(),
    card: null,
    rule: null,
    extra: null,
    kings: 0,
    mates: [],
    picked: null,
    finished: false,
  };
}

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

/**
 * A face for every rule, so the sheet shows the card you will actually draw
 * rather than a number in a box.
 *
 * All spades. The rank is the only thing carrying meaning here — a rule is a
 * rule in any suit — so varying it would suggest a distinction that does not
 * exist, and the spade is the cleanest of the four pips at this size.
 */
const SPADE = SUITS[0];
const RULE_FACES: { rule: (typeof KINGS_CUP_RULES)[number]; card: Card }[] =
  KINGS_CUP_RULES.map((rule) => ({
    rule,
    card: {
      rank: rule.rank,
      label: rankLabel(rule.rank),
      suit: SPADE.suit,
      symbol: SPADE.symbol,
      red: SPADE.red,
    },
  }));

export function KingsCup({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { currentPlayer, advance, hasRoster } = useRoster();
  const [s, setS] = useState<State>(initialState);
  /** The rules sheet, for a table reading them before it plays. */
  const [rulesOpen, setRulesOpen] = useState(false);

  const drawer = currentPlayer ?? "Whoever drew it";

  const draw = useCallback(() => {
    setS((prev) => {
      const { card, rest } = deal(prev.deck);
      const rule = RULE_BY_RANK[card.rank];
      const kings = card.rank === 13 ? prev.kings + 1 : prev.kings;

      // Ranks 10 and J pull from pools that already track the global content
      // mode, so Night Mode reaches inside Kings Cup too.
      let extra: string | null = null;
      if (rule.effect === "category") {
        extra = randomItem(resolvePool(LAST_WORD_CATEGORIES, contentMode, "supplement"));
      } else if (rule.effect === "never-have-i-ever") {
        extra = randomItem(resolvePool(NEVER_HAVE_I_EVER, contentMode, "supplement"));
      }

      return {
        ...prev,
        deck: rest,
        card,
        rule,
        extra,
        kings,
        picked: null,
        finished: kings >= TOTAL_KINGS,
      };
    });
  }, [contentMode, drawer]);

  const next = useCallback(() => {
    advance();
    draw();
  }, [advance, draw]);

  const pick = useCallback((name: string) => {
    setS((prev) => {
      if (prev.rule?.effect === "pick-mate" && currentPlayer) {
        // The same pairing can come up twice across four 8s — record it once,
        // or the footer repeats itself and two chips collide on the same key.
        const exists = prev.mates.some(
          ([x, y]) =>
            (x === currentPlayer && y === name) || (x === name && y === currentPlayer),
        );
        return exists
          ? { ...prev, picked: name }
          : { ...prev, picked: name, mates: [...prev.mates, [currentPlayer, name]] };
      }
      return { ...prev, picked: name };
    });
  }, [currentPlayer]);

  const restart = useCallback(() => setS(initialState()), []);

  // ---- What every card means ----
  if (rulesOpen) {
    return (
      /* Full page and one way out, exactly like the category picker: the
         header's chevron would leave the game, and this is a detour from it,
         not a way out of it. */
      <GameScreen mode={mode} hideHeader onBack={onBack}>
        <div className="picker">
          <div className="picker__scroll" onScroll={fadeOnScroll}>
            <ol className="kc-rules">
              {RULE_FACES.map(({ rule, card }) => (
                <li key={rule.rank} className="kc-rules__row">
                  <PlayingCard card={card} small />
                  <span className="kc-rules__body">
                    <span className="kc-rules__label">{rule.label}</span>
                    <span className="kc-rules__text">{rule.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="picker__depth" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="actions">
            <button className="btn btn--float btn--block" onClick={() => setRulesOpen(false)}>
              Back
            </button>
          </div>
        </div>
      </GameScreen>
    );
  }

  // ---- Fourth king: the game is over ----
  if (s.finished) {
    return (
      <GameScreen mode={mode} onBack={onBack}>
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">King's Cup</span>
              <p className="card__prompt">
                {hasRoster ? `${drawer} drinks the cup.` : "Whoever drew it drinks the cup."}
              </p>
              <p className="card__meta">That's the game. Pour a new one.</p>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={restart}>
              New game
            </button>
          </div>
        </CardBody>
      </GameScreen>
    );
  }

  // ---- Opening screen ----
  if (!s.card) {
    return (
      <GameScreen mode={mode} onBack={onBack}>
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Kings Cup</span>
              <p className="card__prompt">Spread the deck. Draw one each, in turn.</p>
              <p className="card__meta">The fourth king drinks the cup.</p>
            </div>
          }
        >
          {/* Before the first card, not during — a table reads the ruleset
              once, on the way in. */}
          <button className="gfoot__skip" onClick={() => setRulesOpen(true)}>
            What the cards mean
          </button>
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={draw}>
              Draw first card
            </button>
          </div>
        </CardBody>
      </GameScreen>
    );
  }

  return (
    <GameScreen
      mode={mode}
      subtitle={hasRoster ? `${drawer}'s draw` : "Draw a card"}
      aside={
        <div className="kc__status">
          <span className="kc__kings" aria-label={`${s.kings} of ${TOTAL_KINGS} kings drawn`}>
            {Array.from({ length: TOTAL_KINGS }, (_, i) => (
              <span key={i} className="kc__king" data-drawn={i < s.kings || undefined}>
                K
              </span>
            ))}
          </span>
          <span className="kc__left">{s.deck.length} left</span>
        </div>
      }
      onBack={onBack}
    >
      <div className="focal kc">
        {/* Card and the copy under it form one centred block, and the block's
            lower half has a reserved height. That combination is what gets
            both things at once: the group sits centred, and because the space
            below the card never changes size, the card itself lands on the
            same pixels for all 52 draws — whether the rule is one line
            ("Drink") or four (Drive), and whether or not a picker appears. */}
        <div className="kc__body">
          <div className="kc__card">
            <PlayingCard card={s.card} />
          </div>

          {/* Keyed on the draw so the rule replays with every card — without
              it React reuses the element and the animation runs once, on the
              first card of the game only. */}
          <div className="kc__below" key={s.deck.length}>
            <div className="kc__rule">
              <span className="kc__rule-label">{s.rule?.label}</span>
              <p className="kc__rule-text">{s.rule?.text}</p>
            </div>

            {s.extra && (
              <p className="kc__extra">
                <span className="kc__extra-label">
                  {s.rule?.effect === "category" ? "Category" : "Never have I ever"}
                </span>
                {s.extra}
              </p>
            )}

            {s.rule?.effect === "drive" && (
              <div className="kc__calls">
                {DRIVE_CALLS.map(({ call, means }) => (
                  <span key={call} className="kc__call">
                    <strong>{call}</strong> {means}
                  </span>
                ))}
              </div>
            )}

            {(s.rule?.effect === "pick-player" || s.rule?.effect === "pick-mate") &&
              (s.picked ? (
                <p className="kc__picked">
                  {s.rule.effect === "pick-mate"
                    ? `${s.picked} is your mate.`
                    : `${s.picked} drinks.`}
                </p>
              ) : (
                <PlayerPicker onPick={pick} exclude={currentPlayer} />
              ))}
          </div>
        </div>

        {s.mates.length > 0 && (
          <div className="kc__book">
            {s.mates.map(([x, y]) => (
              <span className="kc__book-item" key={`${x}-${y}`}>
                Mates · {x} + {y}
              </span>
            ))}
          </div>
        )}

        <div className="actions">
          <button className="btn btn--lg btn--block" onClick={next}>
            Next card
          </button>
        </div>
      </div>
    </GameScreen>
  );
}
