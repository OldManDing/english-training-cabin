import type { KeyboardEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  ariaLabel: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
  testId?: string;
}

interface DateFieldProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  testId?: string;
}

function useFloatingClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return ref;
}

function safeDomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function SelectField({
  ariaLabel,
  value,
  options,
  onChange,
  className = '',
  compact = false,
  testId,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState(value);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];
  const enabledOptions = options.filter((option) => !option.disabled);
  const wrapperRef = useFloatingClose<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    if (open) setActiveValue(selected?.value ?? enabledOptions[0]?.value ?? '');
  }, [enabledOptions, open, selected?.value]);

  const chooseOption = (nextValue: string) => {
    const next = options.find((option) => option.value === nextValue);
    if (!next || next.disabled) return;
    onChange(next.value);
    setOpen(false);
  };

  const moveActiveOption = (direction: 'next' | 'previous' | 'first' | 'last') => {
    if (enabledOptions.length === 0) return;

    const currentIndex = Math.max(
      enabledOptions.findIndex((option) => option.value === activeValue),
      0,
    );
    const lastIndex = enabledOptions.length - 1;
    const nextIndex =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? lastIndex
          : direction === 'next'
            ? Math.min(currentIndex + 1, lastIndex)
            : Math.max(currentIndex - 1, 0);

    setActiveValue(enabledOptions[nextIndex]?.value ?? enabledOptions[0].value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && activeValue) {
        chooseOption(activeValue);
      } else {
        setOpen(true);
      }
      return;
    }

    const keyToDirection: Record<string, 'next' | 'previous' | 'first' | 'last'> = {
      ArrowDown: 'next',
      ArrowUp: 'previous',
      Home: 'first',
      End: 'last',
    };
    const direction = keyToDirection[event.key];
    if (!direction) return;

    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    moveActiveOption(direction);
  };

  const activeOptionId = activeValue ? `${listboxId}-${safeDomId(activeValue)}` : undefined;

  return (
    <div ref={wrapperRef} className={`ui-choice-shell ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? activeOptionId : undefined}
        data-testid={testId}
        className={`ui-choice-trigger ${compact ? 'ui-choice-trigger-compact' : ''} ${open ? 'ui-choice-trigger-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="truncate text-left">{selected?.label ?? '请选择'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={listboxId} role="listbox" aria-label={ariaLabel} className="ui-choice-panel">
          {options.map((option) => {
            const isSelected = option.value === selected?.value;
            const isHighlighted = option.value === activeValue;
            return (
              <button
                id={`${listboxId}-${safeDomId(option.value)}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                disabled={option.disabled}
                className={`ui-choice-option ${isSelected ? 'ui-choice-option-active' : ''} ${
                  isHighlighted ? 'ui-choice-option-highlighted' : ''
                }`}
                onMouseEnter={() => setActiveValue(option.value)}
                onClick={() => chooseOption(option.value)}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                {option.disabled && <span className="ui-choice-option-badge">未开放</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthTitle(date: Date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

export function DateField({ ariaLabel, value, onChange, className = '', testId }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const wrapperRef = useFloatingClose<HTMLDivElement>(open, () => setOpen(false));
  const selectedDate = parseIsoDate(value);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  useEffect(() => {
    if (open) setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [open, selectedDate.getFullYear(), selectedDate.getMonth()]);

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const first = new Date(year, month, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [visibleMonth]);

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const selectDate = (date: Date) => {
    onChange(toIsoDate(date));
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const today = new Date();
  const todayIso = toIsoDate(today);

  return (
    <div ref={wrapperRef} className={`ui-choice-shell ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid={testId}
        className={`ui-choice-trigger ${open ? 'ui-choice-trigger-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="flex min-w-0 items-center gap-2 truncate text-left">
          <Calendar className="h-4 w-4 shrink-0 text-[#003178]" />
          <span className="truncate">{value || '选择日期'}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={dialogId} role="dialog" aria-label={`${ariaLabel} 日历`} className="ui-calendar-panel">
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="ui-calendar-nav" aria-label="上个月" onClick={() => moveMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-black text-[#003178]">{monthTitle(visibleMonth)}</div>
            <button type="button" className="ui-calendar-nav" aria-label="下个月" onClick={() => moveMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  type="button"
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  title={iso}
                  className={`ui-calendar-day ${inMonth ? '' : 'ui-calendar-day-muted'} ${isToday ? 'ui-calendar-day-today' : ''} ${
                    isSelected ? 'ui-calendar-day-selected' : ''
                  }`}
                  onClick={() => selectDate(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#e5edf5] pt-3">
            <button type="button" className="ui-calendar-shortcut" onClick={() => selectDate(today)}>
              今天
            </button>
            <button type="button" className="ui-calendar-shortcut" onClick={() => setOpen(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
