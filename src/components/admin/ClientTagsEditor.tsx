"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Tags sugeridos con su clase de color asignado.
 * Cada tag pre-definido usa una paleta consistente; los custom usan estilo neutro.
 */
const SUGGESTED_TAGS: Array<{ name: string; tone: TagTone }> = [
  { name: "VIP", tone: "gold" },
  { name: "Habitual", tone: "green" },
  { name: "Nuevo", tone: "blue" },
  { name: "Llega tarde", tone: "amber" },
  { name: "Buen pagador", tone: "green" },
  { name: "Difícil", tone: "red" },
];

type TagTone = "gold" | "green" | "blue" | "amber" | "red" | "neutral";

export function getTagTone(tagName: string): TagTone {
  const found = SUGGESTED_TAGS.find(
    (t) => t.name.toLowerCase() === tagName.toLowerCase(),
  );
  return found?.tone ?? "neutral";
}

export function tagClassesFor(tone: TagTone): string {
  switch (tone) {
    case "gold":
      return "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]";
    case "green":
      return "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]";
    case "blue":
      return "border-blue-500/40 bg-blue-500/10 text-blue-400";
    case "amber":
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    case "red":
      return "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]";
    default:
      return "border-[color:var(--border-default)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]";
  }
}

type ClientTagsEditorProps = {
  tags: string[];
  disabled?: boolean;
  onChange: (tags: string[]) => void;
};

export function ClientTagsEditor({
  tags,
  disabled,
  onChange,
}: ClientTagsEditorProps) {
  const [customInput, setCustomInput] = useState("");

  const normalized = tags.map((t) => t.trim()).filter((t) => t.length > 0);
  const hasTag = (name: string) =>
    normalized.some((t) => t.toLowerCase() === name.toLowerCase());

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (hasTag(trimmed)) return;
    onChange([...normalized, trimmed]);
  }

  function removeTag(name: string) {
    onChange(normalized.filter((t) => t.toLowerCase() !== name.toLowerCase()));
  }

  function handleAddCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customInput.trim()) {
      addTag(customInput);
      setCustomInput("");
    }
  }

  const availableSuggestions = SUGGESTED_TAGS.filter(
    ({ name }) => !hasTag(name),
  );

  return (
    <div className="grid gap-3">
      {/* Tags actuales */}
      <div className="flex flex-wrap gap-2">
        {normalized.length === 0 ? (
          <p className="text-xs text-[color:var(--text-subtle)]">
            Sin tags. Agregá uno desde abajo.
          </p>
        ) : (
          normalized.map((tag) => {
            const tone = getTagTone(tag);
            return (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center gap-1 rounded-[var(--radius-xs)] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                  tagClassesFor(tone),
                )}
              >
                {tag}
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Quitar tag ${tag}`}
                    className="inline-flex size-3 items-center justify-center opacity-70 hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </span>
            );
          })
        )}
      </div>

      {/* Sugerencias */}
      {!disabled && availableSuggestions.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Sugerencias
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map(({ name, tone }) => (
              <button
                key={name}
                type="button"
                onClick={() => addTag(name)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-[var(--radius-xs)] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] opacity-60 transition-opacity duration-[var(--duration-fast)] hover:opacity-100",
                  tagClassesFor(tone),
                )}
              >
                <Plus className="size-3" />
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Custom */}
      {!disabled ? (
        <form onSubmit={handleAddCustom} className="grid gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Agregar tag propio
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Ej: Cumple en mayo"
              maxLength={30}
              className="min-h-9 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-xs text-white outline-none placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)]/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-3" />
              Agregar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
