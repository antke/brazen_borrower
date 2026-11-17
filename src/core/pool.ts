import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { cardLabel, type Card } from "./cards"
import { errorMessage } from "./format"

export type PoolRow = NonNullable<ReturnType<typeof useQuery<typeof api.pool.list>>>[number]

export function usePool() {
  const pool = useQuery(api.pool.list)
  const setOffer = useMutation(api.pool.set)
  const [filter, setFilter] = useState("")
  const words = filter.trim().toLowerCase()
  return {
    loading: pool === undefined,
    rows: pool?.filter((r) => `${r.card ? cardLabel(r.card) : ""} ${r.owner}`.toLowerCase().includes(words)) ?? [],
    filter,
    setFilter,
    withdraw: (row: PoolRow) => void setOffer({ ownerId: row.ownerId, cardId: row.cardId, quantity: 0 }),
  }
}

export function usePoolOffer() {
  const setOffer = useMutation(api.pool.set)
  const [owner, setOwner] = useState<string | null>(null)
  const [copies, setCopies] = useState(1)
  const [error, setError] = useState("")
  async function offer(card: Card) {
    if (!owner) return setError("Choose whose card this is first")
    try {
      await setOffer({ ownerId: owner as Id<"people">, cardId: card._id, quantity: copies })
      setError("")
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return { owner, setOwner, copies, setCopies, offer, error }
}
