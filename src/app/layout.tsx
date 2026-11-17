import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AgentBridge } from "./agent-bridge";
import { ConvexClientProvider } from "./convex-provider";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riftbound card pool",
  description: "Who has whose Riftbound cards.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <ConvexClientProvider>
          <header className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
              <span className="font-semibold">Riftbound card pool</span>
              <Nav />
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
        </ConvexClientProvider>
        <AgentBridge />
      </body>
    </html>
  );
}
