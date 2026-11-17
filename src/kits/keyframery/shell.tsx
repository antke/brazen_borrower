"use client"

import { SignInButton, SignOutButton } from "@clerk/nextjs"
import { Moon, Sun } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { labels } from "@/core/labels"
import { useSession } from "@/core/people"
import { toggleTheme } from "@/core/theme"
import mark from "@/images/borrower_mark.png"
import { Button } from "@/kits/keyframery/ui/button"

const links = [
  { href: "/", label: "Loans" },
  { href: "/shared", label: "Shared collection", short: "Shared" },
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

/** Flips light and dark. Both icons render and CSS shows the one for the current theme, so the server render never guesses. */
function ThemeToggle() {
  return (
    <Button variant="ghost" size="icon" aria-label={labels.toggleTheme} onClick={toggleTheme}>
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  )
}

function Account() {
  const session = useSession()
  if (session.loading) return <ThemeToggle />
  if (!session.signedIn)
    return (
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <SignIn />
      </div>
    )
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm sm:inline">{session.me?.name}</span>
      <ThemeToggle />
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
    // The app is one window tall: the header stays put and the page below shares what's left (see kit.css).
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b">
        {/* Phones put the nav on its own row under the name and account: a full-width segmented control,
            three equal segments in one track, so it reads as navigation rather than stray links. */}
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-2.5 sm:grid-cols-[1fr_auto_1fr]">
          <span className="col-start-1 row-start-1 flex items-center gap-2.5">
            <Image src={mark} alt="" width={40} height={40} priority className="-my-1.5 size-10" />
            <span className="font-display text-lg leading-none">Brazen Borrower</span>
          </span>
          <nav
            aria-label="Main"
            className="col-span-2 col-start-1 row-start-2 grid grid-cols-3 gap-1 rounded-xl border p-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex sm:rounded-none sm:border-0 sm:p-0"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className="rounded-lg px-3 py-1.5 text-center text-sm whitespace-nowrap text-muted-foreground transition-colors ease-house hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
              >
                {link.short ? (
                  <>
                    <span className="sm:hidden">{link.short}</span>
                    <span className="hidden sm:inline">{link.label}</span>
                  </>
                ) : (
                  link.label
                )}
              </Link>
            ))}
          </nav>
          <div className="col-start-2 row-start-1 justify-self-end sm:col-start-3">
            <Account />
          </div>
        </div>
      </header>
      <main className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-[minmax(0,1fr)] content-start gap-6 overflow-y-auto px-4 py-8">{children}</main>
    </div>
  )
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 data-slot="page-title" className="text-3xl leading-tight text-balance sm:text-4xl">
        {title}
      </h1>
      {actions}
    </div>
  )
}
