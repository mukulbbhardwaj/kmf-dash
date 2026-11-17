"use client";

import { useActionState, useState } from "react";
import { saveTreatment, type FormState } from "@/app/actions";
import { addDays, fmtDay } from "@/lib/dates";
import { DropIcon } from "./icons";
import { Chip, CowPicker, type CowOption, Field, SaveBar, Segmented, Stepper, inputClass } from "./form";

export type MedicinePreset = {
  medicine: string;
  dose: number | null;
  unit: string;
  route: string | null;
  timesPerDay: number;
  days: number;
  withdrawalDays: number;
};

const ROUTES = ["Injection", "Oral", "Udder", "Skin"];
const UNITS = [
  { value: "ml", label: "ml" },
  { value: "g", label: "g" },
  { value: "tablet", label: "tablet" },
];
const TIMES = [
  { value: 1, label: "Once a day" },
  { value: 2, label: "Twice" },
  { value: 3, label: "3 times" },
];

export function MedicineForm({
  cows,
  initialCowIds,
  recent,
  presets,
  today,
}: {
  cows: CowOption[];
  initialCowIds: number[];
  recent: string[];
  presets: Record<string, MedicinePreset>;
  today: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveTreatment, {});
  const [cowIds, setCowIds] = useState(initialCowIds);
  const [medicine, setMedicine] = useState("");
  const [dose, setDose] = useState<number | null>(null);
  const [unit, setUnit] = useState("ml");
  const [route, setRoute] = useState<string | null>(null);
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [days, setDays] = useState<number | null>(1);
  const [withdrawal, setWithdrawal] = useState<number | null>(0);
  const [startDate, setStartDate] = useState(today);

  const applyPreset = (name: string) => {
    setMedicine(name);
    const p = presets[name.toLowerCase()];
    if (!p) return;
    setDose(p.dose);
    setUnit(p.unit);
    setRoute(p.route);
    setTimesPerDay(p.timesPerDay);
    setDays(p.days);
    setWithdrawal(p.withdrawalDays);
  };

  const lastDose = addDays(startDate || today, Math.max(1, days ?? 1) - 1);
  const safeFrom = addDays(lastDose, withdrawal ?? 0);

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="route" value={route ?? ""} />
      <input type="hidden" name="times_per_day" value={timesPerDay} />

      <div className="flex flex-col gap-5 px-5 pt-3 pb-6">
        <Field label="Cows" hint="add several for a whole group">
          <CowPicker cows={cows} selected={cowIds} onChange={setCowIds} multiple />
        </Field>

        <Field label="Medicine" htmlFor="medicine">
          <input
            id="medicine"
            name="medicine"
            value={medicine}
            onChange={(e) => setMedicine(e.target.value)}
            onBlur={(e) => presets[e.target.value.trim().toLowerCase()] && applyPreset(presets[e.target.value.trim().toLowerCase()].medicine)}
            placeholder="Medicine name"
            autoComplete="off"
            className={`${inputClass} font-semibold`}
          />
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Recent:</span>
              {recent.map((m) => (
                <Chip key={m} selected={medicine.toLowerCase() === m.toLowerCase()} onClick={() => applyPreset(m)}>
                  {m}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        <Field label="Dose">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Stepper name="dose" label="dose" value={dose} onChange={setDose} step={unit === "tablet" ? 1 : 5} min={0} max={1000} decimals={1} unit={unit} />
            <div className="w-36">
              <Segmented name="unit" label="Unit" value={unit} onChange={setUnit} options={UNITS} />
            </div>
          </div>
        </Field>

        <Field label="How given">
          <div className="grid grid-cols-4 gap-1.5">
            {ROUTES.map((r) => (
              <Chip key={r} variant="box" selected={route === r} onClick={() => setRoute(route === r ? null : r)}>
                {r}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="How often">
          <div className="grid grid-cols-3 gap-1.5">
            {TIMES.map((t) => (
              <Chip key={t.value} variant="box" selected={timesPerDay === t.value} onClick={() => setTimesPerDay(t.value)}>
                {t.label}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="For how many days">
            <Stepper name="days" label="days" size="sm" value={days} onChange={setDays} min={1} max={90} />
          </Field>
          <Field label="Milk withdrawal" hint="days">
            <Stepper name="withdrawal_days" label="withdrawal days" size="sm" value={withdrawal} onChange={setWithdrawal} min={0} max={120} />
          </Field>
        </div>

        <div className={`flex items-start gap-3 rounded-2xl p-3.5 ${withdrawal ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-ink"}`}>
          <DropIcon size={22} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            {withdrawal ? (
              <>
                <span className="text-sm font-bold">Milk safe to sell from {fmtDay(safeFrom)}</span>
                <span className="text-[13px]">
                  Last dose {fmtDay(lastDose)} + {withdrawal} {withdrawal === 1 ? "day" : "days"} withdrawal. Check the medicine label.
                </span>
              </>
            ) : (
              <span className="text-sm font-bold">No milk withdrawal set. Check the medicine label.</span>
            )}
          </div>
        </div>

        <Field label="First dose given on" htmlFor="start_date">
          <input id="start_date" name="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Note" hint="optional" htmlFor="note">
          <textarea id="note" name="note" rows={2} placeholder="e.g. Prescribed by Dr. …" className={`${inputClass} h-auto resize-none py-3`} />
        </Field>
      </div>
      <SaveBar label={cowIds.length > 1 ? `Save for ${cowIds.length} cows` : "Save medicine"} error={state.error} />
    </form>
  );
}
