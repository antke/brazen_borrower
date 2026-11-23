import { clerkMiddleware } from "@clerk/nextjs/server"

/** Runs Clerk on every request. */
export default clerkMiddleware()

export const config = {
  // Clerk's recommended matcher: everything but Next internals and static files, plus Clerk's own routes.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
}
