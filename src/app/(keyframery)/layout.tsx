import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import type { ReactNode } from "react"
import { Providers } from "@/core/providers"
import { Shell } from "@/kits/keyframery/shell"
import "@/kits/keyframery/kit.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Brazen Borrower",
  description: "Who has whose Riftbound cards.",
}

export default function KeyframeryLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
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
