"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Loans" },
  { href: "/pool", label: "Pool" },
  { href: "/people", label: "People" },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className="flex gap-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100 aria-[current=page]:bg-neutral-900 aria-[current=page]:text-white dark:hover:bg-neutral-800 dark:aria-[current=page]:bg-neutral-100 dark:aria-[current=page]:text-neutral-900"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
