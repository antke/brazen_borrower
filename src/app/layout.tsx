import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Faculty_Glyphic, Geist } from "next/font/google"
import type { ReactNode } from "react"
import { Providers } from "@/core/providers"
import { themeScript } from "@/core/theme"
import { Shell } from "@/kits/keyframery/shell"
import "./globals.css"

// Geist carries the tables and controls; Faculty Glyphic, cut like a card's title line, carries titles.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const glyphic = Faculty_Glyphic({ subsets: ["latin"], weight: "400", variable: "--font-glyphic" })

export const metadata: Metadata = {
  title: "Brazen Borrower",
  description: "Who has whose Riftbound cards.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script sets the `dark` class before React hydrates, so <html> differs from the server render.
    <html lang="en" className={`${geist.variable} ${glyphic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ClerkProvider>
          <Providers>
            <Shell>{children}</Shell>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
