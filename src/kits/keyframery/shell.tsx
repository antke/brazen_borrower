"use client"

import { SignInButton, SignOutButton } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { labels } from "@/core/labels"
import { useSession } from "@/core/people"
import { Button } from "@/kits/keyframery/ui/button"

const links = [
  { href: "/", label: "Loans" },
  { href: "/pool", label: "Pool" },
  { href: "/me", label: "Me" },
]

/** Sends the visitor to Clerk's sign-in page and back. */
export function SignIn({ label = labels.signIn }: { label?: string }) {
  return (
    <SignInButton>
      <Button variant="primary">{label}</Button>
    </SignInButton>
  )
}

function Account() {
  const session = useSession()
  if (session.loading) return null
  if (!session.signedIn) return <SignIn />
  return (
    <div className="flex items-center gap-3">
      <span>{session.me?.name}</span>
      <SignOutButton>
        <Button variant="ghost">{labels.signOut}</Button>
      </SignOutButton>
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  // The proxy serves this kit under /keyframery, but the browser keeps the shared URL.
  const pathname = usePathname().replace(/^\/keyframery(?=\/|$)/, "") || "/"
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <span className="font-semibold tracking-tight">Riftbound card pool</span>
          <nav aria-label="Main" className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors ease-house hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Account />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">{children}</main>
    </>
  )
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {actions}
    </div>
  )
}
