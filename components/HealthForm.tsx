"use client";

import { useActionState, useState } from "react";
import { saveHealthCheck, type FormState } from "@/app/actions";
import type { Condition } from "@/lib/data";
import { AlertIcon, CheckIcon, InfoIcon } from "./icons";
import { Chip, CowPicker, type CowOption, Field, SaveBar, Stepper, inputClass } from "./form";

const SYMPTOMS = ["Swollen udder", "Fever", "Less milk", "Not eating", "Limping", "Diarrhea", "Cough", "Nasal discharge", "Bloating", "In heat", "Injury"];

const CONDITIONS: { value: Condition; label: string; Icon: typeof CheckIcon; on: string; off: string }[] = [
  { value: "healthy", label: "Healthy", Icon: CheckIcon, on: "border-2 border-brand bg-brand-soft", off: "text-brand-ink" },
  { value: "watch", label: "Watch", Icon: InfoIcon, on: "border-2 border-warn bg-warn-soft", off: "text-warn" },
  { value: "sick", label: "Sick", Icon: AlertIcon, on: "border-2 border-bad bg-bad-soft", off: "text-bad" },
];

const NORMAL_LOW = 38.0;
const NORMAL_HIGH = 39.3;

export function HealthForm({ cows, initialCowId, today, now }: { cows: CowOption[]; initialCowId: number | null; today: string; now: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveHealthCheck, {});
  const [cowIds, setCowIds] = useState<number[]>(initialCowId ? [initialCowId] : []);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);

  const toggle = (s: string) => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const tempNote = temp == null ? null : temp > NORMAL_HIGH ? "Above normal" : temp < NORMAL_LOW ? "Below normal" : "Normal";

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="condition" value={condition ?? ""} />
      <input type="hidden" name="time" value={now} />
      {symptoms.map((s) => (
        <input key={s} type="hidden" name="symptoms" value={s} />
      ))}

      <div className="flex flex-col gap-5 px-5 pt-3 pb-6">
        <Field label="Cow">
          <CowPicker cows={cows} selected={cowIds} onChange={setCowIds} />
        </Field>

        <Field label="How is she?">
          <div role="radiogroup" aria-label="Condition" className="grid grid-cols-3 gap-2">
            {CONDITIONS.map(({ value, label, Icon, on, off }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={condition === value}
                onClick={() => setCondition(value)}
                className={`flex h-19 flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-bold ${off} ${
                  condition === value ? on : "border border-line bg-surface"
                }`}
              >
                <Icon size={22} />
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Temperature" hint="optional">
          <Stepper name="temperature" label="temperature" value={temp} onChange={setTemp} step={0.1} min={34} max={43} decimals={1} unit="°C" start={38.6} />
          {temp == null ? (
            <button type="button" onClick={() => setTemp(38.6)} className="self-start text-[13px] font-semibold text-brand">
              Tap + or − to enter, normal is {NORMAL_LOW}–{NORMAL_HIGH} °C
            </button>
          ) : (
            <span className={`text-xs font-semibold ${tempNote === "Normal" ? "text-brand-ink" : "text-bad"}`}>
              {tempNote} ({NORMAL_LOW} – {NORMAL_HIGH} °C)
            </span>
          )}
        </Field>

        <Field label="Symptoms" hint="tap all that apply">
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <Chip key={s} selected={symptoms.includes(s)} onClick={() => toggle(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Note" hint="optional" htmlFor="note">
          <textarea id="note" name="note" rows={2} placeholder="e.g. Vet called, rear left quarter" className={`${inputClass} h-auto resize-none py-3`} />
        </Field>

        <Field label="Date" htmlFor="date">
          <input id="date" name="date" type="date" defaultValue={today} max={today} className={inputClass} />
        </Field>
      </div>
      <SaveBar label="Save health check" error={state.error} />
    </form>
  );
}
