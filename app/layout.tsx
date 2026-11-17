import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Milk Farm Tracker", template: "%s · Milk Farm" },
  description: "Track cow health, medicines and feed by tag number.",
  appleWebApp: { capable: true, title: "Milk Farm", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f6f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-ground">{children}</div>
      </body>
    </html>
  );
}
