"use client";

import { removeRecord } from "@/app/actions";
import { TrashIcon } from "./icons";

export function DeleteRecordButton({ kind, id, back, label }: { kind: "health" | "medicine" | "feed"; id: number; back: string; label: string }) {
  return (
    <form
      action={removeRecord}
      onSubmit={(e) => {
        if (!window.confirm(`Delete this ${label}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" aria-label={`Delete ${label}`} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-chip">
        <TrashIcon size={16} />
      </button>
    </form>
  );
}
