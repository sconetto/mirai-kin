"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function MultiSelectFilter({
  name,
  label,
  options,
  selected,
  allLabel,
  disabled = false,
}: {
  name: string;
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  allLabel: string;
  disabled?: boolean;
}) {
  const t = useTranslations("accounts");
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(selected);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedLabels = values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));
  const summary =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : t("selectedCount", { count: selectedLabels.length });

  return (
    <div ref={rootRef} className="relative">
      {disabled
        ? null
        : values.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
          "outline-none transition hover:border-ink-3/60 focus:border-accent focus:ring-4 focus:ring-accent/10",
          "disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-3",
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 text-ink-3 transition", open && "rotate-180")}
        />
      </button>

      <div
        id={`${id}-options`}
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby={id}
        className={cn(
          "absolute z-30 mt-1 w-full min-w-52 overflow-hidden rounded-lg border border-line bg-surface shadow-lg",
          open ? "block" : "hidden",
        )}
      >
        <ul className="max-h-64 overflow-y-auto p-1">
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <li key={option.value} role="option" aria-selected={checked}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-paper">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setValues((current) =>
                        current.includes(option.value)
                          ? current.filter((value) => value !== option.value)
                          : [...current, option.value],
                      )
                    }
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {values.length > 0 ? (
          <div className="border-t border-line/70 p-1">
            <button
              type="button"
              onClick={() => setValues([])}
              className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-ink-3 hover:bg-paper hover:text-ink"
            >
              {t("clearSelection")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
