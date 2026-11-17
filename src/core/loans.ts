import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { poolTopUp } from "../../convex/lib/cards"
import type { Card } from "./cards"
import { errorMessage } from "./format"
import { sameParty, toParty, useMembers, useSession } from "./people"

export type Loan = NonNullable<ReturnType<typeof useQuery<typeof api.loans.list>>>[number]

export function useMarkReturned() {
  const markReturned = useMutation(api.loans.markReturned)
  return (loan: Loan) => void markReturned({ id: loan._id })
}

export function useLoans() {
  const loans = useQuery(api.loans.list)
  return {
    loading: loans === undefined,
    out: loans?.filter((l) => l.returnedAt === undefined) ?? [],
    returned: loans?.filter((l) => l.returnedAt !== undefined) ?? [],
  }
}

/** The signed-in member's loans still out: cards they lent, and cards they borrowed. */
export function useMyLoans() {
  const { me } = useSession()
  const loans = useQuery(api.loans.mine)?.filter((l) => l.returnedAt === undefined)
  return {
    loading: loans === undefined,
    lent: loans?.filter((l) => me && l.lender.userId === me._id) ?? [],
    borrowed: loans?.filter((l) => me && l.borrower.userId === me._id) ?? [],
  }
}

/** A short mark for a card that saving will add to (or top up in) your pool. */
export function poolNote(change: { from: number; to: number }) {
  return change.from === 0 ? "New to your pool" : `Your pool: ${change.from} → ${change.to}`
}

export function poolSummary(count: number) {
  if (count === 0) return ""
  return count === 1
    ? "Heads up: one of these isn't in your pool yet, so we'll add it when you save."
    : "Heads up: some of these aren't in your pool yet, so we'll add them when you save."
}

/** A loan you're recording: always from you, to a member or anyone you type in. `save` resolves true once it's stored. */
export function useLoanDraft() {
  const create = useMutation(api.loans.create)
  const members = useMembers() ?? []
  const { me } = useSession()
  const [borrower, setBorrower] = useState<string | null>(null)
  const [items, setItems] = useState<{ card: Card; quantity: number }[]>([])
  const [error, setError] = useState("")
  const pool = useQuery(api.pool.list)

  const addCard = (card: Card) =>
    setItems((current) =>
      current.some((i) => i.card._id === card._id)
        ? current.map((i) => (i.card._id === card._id ? { ...i, quantity: Math.min(99, i.quantity + 1) } : i))
        : [...current, { card, quantity: 1 }]
    )
  const setQuantity = (card: Card, quantity: number) =>
    setItems((current) => current.map((i) => (i.card._id === card._id ? { ...i, quantity } : i)))
  const removeCard = (card: Card) => setItems((current) => current.filter((i) => i.card._id !== card._id))

  async function save() {
    if (!borrower?.trim()) {
      setError("Who's borrowing? Pick someone or type a name")
      return false
    }
    const borrowerParty = toParty(borrower, members)
    if (me && sameParty({ userId: me._id }, borrowerParty)) {
      setError("You can't lend cards to yourself")
      return false
    }
    try {
      await create({ borrower: borrowerParty, items: items.map((i) => ({ cardId: i.card._id, quantity: i.quantity })) })
      setBorrower(null)
      setItems([])
      setError("")
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }

  // What saving will add to your pool, worked out the same way the server does it.
  const offers = new Map(pool?.filter((r) => r.ownerId === me?._id).map((r) => [r.cardId as string, r]))
  const withPoolNotes = items.map((item) => {
    const offer = offers.get(item.card._id)
    const change = poolTopUp({ cardId: item.card._id, quantity: item.quantity }, { offered: offer?.quantity, lent: offer?.lent ?? 0 })
    return { ...item, poolNote: change && poolNote(change) }
  })

  return {
    borrower,
    setBorrower,
    // You're always the lender, so you're never offered as the borrower.
    borrowerOptions: members.filter((m) => m._id !== me?._id).map((m) => ({ value: m._id as string, label: m.name })),
    items: withPoolNotes,
    poolSummary: poolSummary(withPoolNotes.filter((i) => i.poolNote).length),
    addCard,
    setQuantity,
    removeCard,
    error,
    save,
  }
}
