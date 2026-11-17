import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import type { Card } from "./cards"
import { errorMessage } from "./format"

export type Loan = NonNullable<ReturnType<typeof useQuery<typeof api.loans.list>>>[number]

export function useLoans() {
  const loans = useQuery(api.loans.list)
  const markReturned = useMutation(api.loans.markReturned)
  return {
    loading: loans === undefined,
    out: loans?.filter((l) => l.returnedAt === undefined) ?? [],
    returned: loans?.filter((l) => l.returnedAt !== undefined) ?? [],
    markReturned: (loan: Loan) => void markReturned({ id: loan._id }),
  }
}

/** A loan being recorded; `save` resolves true once it's stored, and clears the draft. */
export function useLoanDraft() {
  const create = useMutation(api.loans.create)
  const [lender, setLender] = useState<string | null>(null)
  const [borrower, setBorrower] = useState<string | null>(null)
  const [items, setItems] = useState<{ card: Card; quantity: number }[]>([])
  const [error, setError] = useState("")

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
    if (!lender || !borrower) {
      setError("Choose who lends and who borrows")
      return false
    }
    try {
      await create({
        lenderId: lender as Id<"people">,
        borrowerId: borrower as Id<"people">,
        items: items.map((i) => ({ cardId: i.card._id, quantity: i.quantity })),
      })
      setLender(null)
      setBorrower(null)
      setItems([])
      setError("")
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }

  return { lender, setLender, borrower, setBorrower, items, addCard, setQuantity, removeCard, error, save }
}
