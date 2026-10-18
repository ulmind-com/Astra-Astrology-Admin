"use client";

import { Check, Plus, X } from "lucide-react";
import * as React from "react";

import { Badge, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { COMMON_LANGUAGES, SKILLS, SKILL_LABELS, type Skill } from "@/types";

export function SkillPicker({
  value,
  onChange,
}: {
  value: Skill[];
  onChange: (next: Skill[]) => void;
}) {
  const toggle = (skill: Skill) =>
    onChange(value.includes(skill) ? value.filter((s) => s !== skill) : [...value, skill]);

  return (
    <div className="flex flex-wrap gap-2">
      {SKILLS.map((skill) => {
        const selected = value.includes(skill);
        return (
          <button
            key={skill}
            type="button"
            onClick={() => toggle(skill)}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "border-brand-600 bg-brand-300 text-brand-950"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {selected && <Check className="size-3" />}
            {SKILL_LABELS[skill]}
          </button>
        );
      })}
    </div>
  );
}

/** A free-text list — languages, specialities, qualifications. */
export function TagInput({
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = React.useState("");

  function add(raw: string) {
    const item = raw.trim();
    // Duplicates are dropped here as well as on the server.
    if (!item || value.includes(item)) {
      setDraft("");
      return;
    }
    onChange([...value, item]);
    setDraft("");
  }

  const unused = (suggestions ?? []).filter((s) => !value.includes(s)).slice(0, 8);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge key={item} tone="brand" className="pr-1">
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="rounded-full p-0.5 hover:bg-black/10"
                aria-label={`Remove ${item}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds without submitting the surrounding form.
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-border-strong hover:text-foreground disabled:opacity-50"
          aria-label="Add"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => add(item)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-brand-500/50 hover:text-brand-700"
            >
              + {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const LANGUAGE_SUGGESTIONS = COMMON_LANGUAGES;
