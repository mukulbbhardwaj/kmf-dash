import type { CowOption } from "@/components/form";
import type { Cow } from "./data";

export function cowOptions(cows: Cow[]): CowOption[] {
  return cows.map((c) => ({ id: c.id, tag: c.tag, name: c.name, groupName: c.groupName }));
}

export function findTagged(cows: CowOption[], tag: string | string[] | undefined) {
  if (typeof tag !== "string") return null;
  return cows.find((c) => c.tag.toLowerCase() === tag.toLowerCase()) ?? null;
}
