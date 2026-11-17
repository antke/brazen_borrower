import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { kitCookie, kits, readKit } from "@/core/kit"

/** Runs Clerk on every request, then serves the chosen kit's version of a page at the same URL: /pool → /keyframery/pool. */
export default clerkMiddleware((_auth, request) => {
  const { pathname, search } = request.nextUrl
  if (kits.some((kit) => pathname === `/${kit}` || pathname.startsWith(`/${kit}/`))) return
  if (pathname.startsWith("/__clerk/")) return
  const kit = readKit(request.cookies.get(kitCookie)?.value)
  return NextResponse.rewrite(new URL(`/${kit}${pathname === "/" ? "" : pathname}${search}`, request.url))
})

export const config = {
  // Clerk's recommended matcher: everything but Next internals and static files, plus Clerk's own routes.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
}
