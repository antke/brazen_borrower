import { useConvexAuth, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

/** Whether someone is signed in, and their member record once it's stored. */
export function useSession() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip")
  return {
    loading: isLoading || (isAuthenticated && !me),
    signedIn: isAuthenticated && !!me,
    me: me ?? null,
  }
}

export function useMembers() {
  return useQuery(api.users.list)
}

export type PartyInput = { userId: Id<"users"> } | { name: string }

/** A picked member, a typed name that matches a member (so typing your own name still means you), or an outsider. */
export function toParty(value: string, members: { _id: string; name: string }[]): PartyInput {
  const typed = value.trim().toLowerCase()
  const member = members.find((m) => m._id === value || m.name.toLowerCase() === typed)
  return member ? { userId: member._id as Id<"users"> } : { name: value.trim() }
}

export function sameParty(a: PartyInput, b: PartyInput) {
  if ("userId" in a || "userId" in b) return "userId" in a && "userId" in b && a.userId === b.userId
  return a.name.toLowerCase() === b.name.toLowerCase()
}
