import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { cardLabel, type Card } from "./cards"
import { errorMessage } from "./format"

export type PoolRow = NonNullable<ReturnType<typeof useQuery<typeof api.pool.list>>>[number]

/** Everyone's offers, read-only, narrowed by a filter over card and owner. */
export function usePool() {
  const pool = useQuery(api.pool.list)
  const [filter, setFilter] = useState("")
  const words = filter.trim().toLowerCase()
  return {
    loading: pool === undefined,
    rows: pool?.filter((r) => `${r.card ? cardLabel(r.card) : ""} ${r.owner}`.toLowerCase().includes(words)) ?? [],
    filter,
    setFilter,
  }
}

/** The signed-in member's own offers, and the controls to change them. */
export function useMyOffers() {
  const rows = useQuery(api.pool.mine)
  const setOffer = useMutation(api.pool.set)
  const [copies, setCopies] = useState(1)
  const [error, setError] = useState("")

  async function save(cardId: Card["_id"], quantity: number) {
    try {
      await setOffer({ cardId, quantity })
      setError("")
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return {
    loading: rows === undefined,
    rows: rows ?? [],
    copies,
    setCopies,
    error,
    offer: (card: Card) => save(card._id, copies),
    setRowCopies: (row: PoolRow, quantity: number) => save(row.cardId, quantity),
    withdraw: (row: PoolRow) => save(row.cardId, 0),
  }
}
