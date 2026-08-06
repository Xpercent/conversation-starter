interface Props {
  labels: [string, string, string];
  /** 0 = none lit, 3 = all lit. */
  reached: number;
}

export function SpeechStages({ labels, reached }: Props) {
  return (
    <ul className="speech-stages">
      {labels.map((label, i) => (
        <li key={label} className={`speech-stage ${i < reached ? 'is-hit' : 'is-pending'}`}>
          <span className="speech-stage-label">{label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Stages light at one third and two thirds elapsed; all three when done. */
export function stagesReached(remaining: number, total: number, done: boolean): number {
  if (done) return 3;
  if (total <= 0) return 1;
  const elapsed = total - remaining;
  if (elapsed >= (2 / 3) * total) return 3;
  if (elapsed >= (1 / 3) * total) return 2;
  return 1;
}
