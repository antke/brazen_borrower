import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AgentBridge } from "./agent-bridge";
import { ConvexClientProvider } from "./convex-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UI SDK playground",
  description: "Next.js + Convex + UI SDK test app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <AgentBridge />
      </body>
    </html>
  );
}
