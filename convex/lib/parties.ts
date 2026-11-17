export type Party = { userId?: string; name: string }

export function cleanName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ")
  if (!clean || clean.length > 40) throw new Error("Names must be 1 to 40 characters")
  return clean
}

/** Same member, or the same name ignoring case unless both are (different) members, so typing your own name still means you. */
export function sameParty(a: Party, b: Party) {
  if (a.userId !== undefined && b.userId !== undefined) return a.userId === b.userId
  return a.name.toLowerCase() === b.name.toLowerCase()
}
