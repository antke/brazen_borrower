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

/** Picker options for members; a picker's value is a member's id, or any name typed in. */
export function useMemberOptions() {
  return useMembers()?.map((m) => ({ value: m._id as string, label: m.name })) ?? []
}

export type PartyInput = { userId: Id<"users"> } | { name: string }

export function toParty(value: string, members: { _id: string }[]): PartyInput {
  return members.some((m) => m._id === value) ? { userId: value as Id<"users"> } : { name: value }
}
