import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { removeCow } from "@/app/actions";
import { CowForm } from "@/components/CowForm";
import { Loading, PageHeader } from "@/components/ui";
import { getCowByTag, listBreeds, listGroups } from "@/lib/data";

export default function EditCowPage(props: PageProps<"/cows/[tag]/edit">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditCow {...props} />
    </Suspense>
  );
}

async function EditCow({ params }: PageProps<"/cows/[tag]/edit">) {
  const { tag } = await params;
  const user = await requireUser();
  const cow = await getCowByTag(decodeURIComponent(tag));
  if (!cow) notFound();

  return (
    <>
      <PageHeader title={`Edit ${cow.tag}`} close={`/cows/${encodeURIComponent(cow.tag)}`} />
      <CowForm cow={cow} groups={(await listGroups()).map((g) => g.name)} breeds={await listBreeds()} />
      {user.role === "admin" && (
        <form action={removeCow} className="px-5 pb-10">
          <input type="hidden" name="id" value={cow.id} />
          <details className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-bad">Remove this cow</summary>
            <p className="mt-2 text-muted">This deletes the cow and all its health, medicine and feed records. It cannot be undone.</p>
            <button type="submit" className="mt-3 h-11 rounded-xl bg-bad px-4 font-bold text-white">
              Delete cow {cow.tag}
            </button>
          </details>
        </form>
      )}
    </>
  );
}
