import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
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

/** A loan being recorded; the lender starts as the signed-in member. `save` resolves true once it's stored. */
export function useLoanDraft() {
  const create = useMutation(api.loans.create)
  const members = useMembers() ?? []
  const { me } = useSession()
  // undefined until the person picks someone, so the lender can default to whoever is signed in.
  const [lenderChoice, setLender] = useState<string | null>()
  const [borrower, setBorrower] = useState<string | null>(null)
  const [items, setItems] = useState<{ card: Card; quantity: number }[]>([])
  const [error, setError] = useState("")
  const lender = lenderChoice === undefined ? (me?._id ?? null) : lenderChoice

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
    if (!lender?.trim() || !borrower?.trim()) {
      setError("Choose who lends and who borrows")
      return false
    }
    const [lenderParty, borrowerParty] = [toParty(lender, members), toParty(borrower, members)]
    if (sameParty(lenderParty, borrowerParty)) {
      setError("The lender and the borrower must be different people")
      return false
    }
    try {
      await create({
        lender: lenderParty,
        borrower: borrowerParty,
        items: items.map((i) => ({ cardId: i.card._id, quantity: i.quantity })),
      })
      setLender(undefined)
      setBorrower(null)
      setItems([])
      setError("")
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }

  // Each picker leaves out whoever the other side already is.
  const options = (other: string | null) =>
    members.filter((m) => m._id !== other).map((m) => ({ value: m._id as string, label: m.name }))

  return {
    lender,
    setLender,
    lenderOptions: options(borrower),
    borrower,
    setBorrower,
    borrowerOptions: options(lender),
    items,
    addCard,
    setQuantity,
    removeCard,
    error,
    save,
  }
}
