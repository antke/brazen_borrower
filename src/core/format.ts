export const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })

export const errorMessage = (e: unknown) =>
  // Convex prefixes server errors with request details; the thrown message follows "Uncaught Error: ".
  e instanceof Error
    ? (e.message.split("\n").find((l) => l.startsWith("Uncaught Error: "))?.slice(16) ?? e.message)
    : String(e)
