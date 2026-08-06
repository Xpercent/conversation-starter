import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  emoji?: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}

/**
 * Radiogroup styled as a pill with a thumb that slides to the active option.
 *
 * The thumb is positioned by measuring the active button rather than assuming
 * equal fractions: labels differ in width both between options ("Singapore" vs
 * "中文") and between locales, and a fractional thumb visibly misaligns.
 */
export function SegmentedSwitch<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  className = '',
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  const index = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );

  const measure = useCallback(() => {
    const active = refs.current[index];
    const container = containerRef.current;
    if (!active || !container) return;
    setThumb({ left: active.offsetLeft, width: active.offsetWidth });
  }, [index]);

  useLayoutEffect(() => {
    measure();
    // Fonts load asynchronously and change label widths under us.
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [measure, options.length, value]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !back) return;
    event.preventDefault();
    const next = (index + (forward ? 1 : -1) + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`seg-switch ${className} ${disabled ? 'is-disabled' : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <span
        className="seg-thumb"
        aria-hidden="true"
        style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
      />
      {options.map((option, i) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={`seg-option ${active ? 'is-active' : ''}`}
            disabled={disabled}
            onClick={() => onChange(option.id)}
          >
            {option.emoji && (
              <span className="seg-emoji" aria-hidden="true">
                {option.emoji}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
