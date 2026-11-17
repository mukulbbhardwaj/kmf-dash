"use client";

import { useActionState, useState } from "react";
import { saveCow, type FormState } from "@/app/actions";
import type { Cow, Stage } from "@/lib/data";
import { Chip, Field, SaveBar, Segmented, inputClass } from "./form";

const STAGES: { value: Stage; label: string }[] = [
  { value: "milking", label: "Milking" },
  { value: "dry", label: "Dry" },
  { value: "heifer", label: "Heifer" },
  { value: "calf", label: "Calf" },
];

export function CowForm({ cow, groups, breeds }: { cow?: Cow; groups: string[]; breeds: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveCow, {});
  const [stage, setStage] = useState<Stage>(cow?.stage ?? "milking");
  const [group, setGroup] = useState(cow?.groupName ?? "");
  const [breed, setBreed] = useState(cow?.breed ?? "");

  return (
    <form action={action} className="flex flex-1 flex-col">
      {cow && <input type="hidden" name="id" value={cow.id} />}
      <div className="flex flex-col gap-5 px-5 pt-3 pb-6">
        <Field label="Tag number" htmlFor="tag">
          <input
            id="tag"
            name="tag"
            defaultValue={cow?.tag}
            required
            autoFocus={!cow}
            autoComplete="off"
            placeholder="e.g. 1042"
            className={`${inputClass} h-16 font-display text-2xl font-extrabold tracking-wide`}
          />
        </Field>

        <Field label="Name" hint="optional" htmlFor="name">
          <input id="name" name="name" defaultValue={cow?.name ?? ""} autoComplete="off" className={inputClass} />
        </Field>

        <Field label="Stage">
          <Segmented name="stage" label="Stage" value={stage} onChange={setStage} options={STAGES} />
        </Field>

        <Field label="Group" hint="cows fed together" htmlFor="group">
          <input id="group" name="group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. Group A" autoComplete="off" className={inputClass} />
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <Chip key={g} selected={group.toLowerCase() === g.toLowerCase()} onClick={() => setGroup(g)}>
                  {g}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        <Field label="Breed" hint="optional" htmlFor="breed">
          <input id="breed" name="breed" value={breed} onChange={(e) => setBreed(e.target.value)} autoComplete="off" className={inputClass} />
          {breeds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {breeds.slice(0, 6).map((b) => (
                <Chip key={b} selected={breed === b} onClick={() => setBreed(b)}>
                  {b}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        <Field label="Date of birth" hint="optional" htmlFor="birth_date">
          <input id="birth_date" name="birth_date" type="date" defaultValue={cow?.birthDate ?? ""} className={inputClass} />
        </Field>

        <Field label="Notes" hint="optional" htmlFor="notes">
          <textarea id="notes" name="notes" rows={2} defaultValue={cow?.notes ?? ""} className={`${inputClass} h-auto py-3`} />
        </Field>
      </div>
      <SaveBar label={cow ? "Save changes" : "Add cow"} error={state.error} />
    </form>
  );
}
