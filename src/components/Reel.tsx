interface Props {
  topic: string | null;
  spinning: boolean;
  landed: boolean;
  tickKey: number;
  eyebrow: string;
  placeholder: string;
}

/** CJK, fullwidth forms and CJK punctuation occupy a full em. */
const FULL_WIDTH = /[⺀-鿿　-〿＀-￯]/;

/**
 * Rough width of the phrase in em, used by the CSS to size it down until it
 * fits on one line. Counting raw characters would over-estimate mixed strings
 * like "Python入门" and shrink them more than necessary.
 */
function estimateWidth(text: string): number {
  let width = 0;
  for (const char of text) width += FULL_WIDTH.test(char) ? 1 : 0.55;
  return Math.max(1, width);
}

export function Reel({ topic, spinning, landed, tickKey, eyebrow, placeholder }: Props) {
  const text = topic ?? placeholder;
  return (
    <section className={`reel ${spinning ? 'is-spinning' : ''} ${landed ? 'is-landed' : ''}`}>
      <p className="reel-eyebrow">{eyebrow}</p>
      {/* The key is what replays tick-flash on every spin step. */}
      <p
        className="reel-phrase"
        key={tickKey}
        style={{ ['--len' as string]: estimateWidth(text) }}
      >
        {text}
      </p>
    </section>
  );
}
