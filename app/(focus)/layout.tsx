export default function FocusLayout({ children }: LayoutProps<"/">) {
  return <main className="flex min-h-dvh flex-1 flex-col">{children}</main>;
}
