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
                ? "border-[#D97706] bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white font-bold shadow-[0_4px_12px_rgba(217,119,6,0.3)] scale-[1.02]"
                : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-slate-900 hover:bg-amber-50/40 shadow-xs",
            )}
          >
            {selected && <Check className="size-3 stroke-[2.5]" />}
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
    <div className="space-y-2.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-bold text-[#B45309] shadow-xs"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="rounded-full p-0.5 text-amber-700 hover:bg-amber-200/60 transition-colors"
                aria-label={`Remove ${item}`}
              >
                <X className="size-3 stroke-[2.5]" />
              </button>
            </span>
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
          className="rounded-xl border-slate-200 bg-white focus:ring-[#F59E0B]"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
          aria-label="Add"
        >
          <Plus className="size-4 stroke-[2.5]" />
        </button>
      </div>

      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {unused.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => add(item)}
              className="rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-[#D97706] hover:bg-amber-50 hover:text-[#B45309] transition-all cursor-pointer"
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
