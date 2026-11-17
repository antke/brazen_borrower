import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { errorMessage } from "./format"

/** The signed-in member's display name, editable; shown to everyone in loans and the pool. */
export function useDisplayName() {
  const { me } = useSession()
  const rename = useMutation(api.users.rename)
  // undefined until edited, so the field shows the stored name once it loads.
  const [draft, setName] = useState<string>()
  const [error, setError] = useState("")
  const name = draft ?? me?.name ?? ""
  async function save() {
    try {
      await rename({ name })
      setName(undefined)
      setError("")
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return { name, setName, error, save, changed: draft !== undefined && draft !== me?.name }
}

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
