import { NextResponse, type NextRequest } from "next/server"
import { kitCookie, readKit } from "@/core/kit"

/** Serves the chosen kit's version of a page at the same URL: /pool → /keyframery/pool. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const kit = readKit(request.cookies.get(kitCookie)?.value)
  return NextResponse.rewrite(new URL(`/${kit}${pathname === "/" ? "" : pathname}${search}`, request.url))
}

export const config = {
  // Skips Next's own files, anything with an extension, and paths already inside a kit (keep in step with core/kit.ts).
  matcher: ["/((?!_next/|keyframery(?:/|$)|.*\\.).*)"],
}
