import { BottomNav } from "@/components/BottomNav";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="flex flex-1 flex-col pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
