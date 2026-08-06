import { useEffect, useId, useRef, useState } from 'react';
import type { Category, Locale } from '../data/topics';

interface Props {
  categories: Category[];
  value: string;
  locale: Locale;
  disabled?: boolean;
  label: string;
  onChange: (id: string) => void;
}

/** Custom listbox — the native select can't carry the emoji + styling. */
export function CategorySelect({
  categories,
  value,
  locale,
  disabled = false,
  label,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const selectedIndex = Math.max(0, categories.findIndex((c) => c.id === value));
  const selected = categories[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const commit = (index: number) => {
    onChange(categories[index].id);
    setOpen(false);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openAt(selectedIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(categories.length - 1);
    }
  };

  const onOptionKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index + 1) % categories.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index - 1 + categories.length) % categories.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(categories.length - 1);
        break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        commit(index);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`niche-select ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="niche-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="niche-emoji" aria-hidden="true">
          {selected?.emoji}
        </span>
        <span className="niche-label">{selected?.label[locale]}</span>
        <span className="niche-caret" aria-hidden="true" />
      </button>

      {open && (
        <ul className="niche-menu" id={listId} role="listbox" aria-label={label}>
          {categories.map((category, index) => (
            <li key={category.id} role="none">
              <button
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={category.id === value}
                tabIndex={index === activeIndex ? 0 : -1}
                className={`niche-option ${category.id === value ? 'is-active' : ''}`}
                onClick={() => commit(index)}
                onKeyDown={(event) => onOptionKeyDown(event, index)}
              >
                <span className="niche-emoji" aria-hidden="true">
                  {category.emoji}
                </span>
                <span className="niche-label">{category.label[locale]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
