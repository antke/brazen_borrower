import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { freeCopies, poolTopUp } from "../../convex/lib/cards"
import { searchCards, type Card } from "./cards"
import { errorMessage } from "./format"
import { sameParty, toParty, useMembers, useSession } from "./people"

export type Loan = NonNullable<ReturnType<typeof useQuery<typeof api.loans.list>>>[number]

export function useMarkReturned() {
  const markReturned = useMutation(api.loans.markReturned)
  return (loan: Loan) => void markReturned({ id: loan._id })
}

/** How many copies of each card on a loan came back; only the cards with some. */
export function returningItems(loan: Loan, back: Record<string, number>) {
  return loan.items.filter((i) => (back[i.cardId] ?? 0) > 0).map((i) => ({ cardId: i.cardId, quantity: back[i.cardId] }))
}

/** Some of a loan's cards came back early: those move to Returned and the rest stay out. Resolves to an error message, or "" once saved. */
export function useReturnCards() {
  const returnCards = useMutation(api.loans.returnCards)
  return async (loan: Loan, back: Record<string, number>) => {
    try {
      await returnCards({ id: loan._id, items: returningItems(loan, back) })
      return ""
    } catch (e) {
      return errorMessage(e)
    }
  }
}

/** Narrows the loans list: a lender's name, a borrower's name ("" means anyone), and card words that one of a loan's cards must match. */
export type LoanFilter = { lender: string; borrower: string; cards: string }

export function filterLoans(loans: Loan[], filter: LoanFilter) {
  return loans.filter(
    (loan) =>
      (!filter.lender || loan.lender.name === filter.lender) &&
      (!filter.borrower || loan.borrower.name === filter.borrower) &&
      // Matched the way the card search matches: every word in a card's name, set or number.
      (!filter.cards.trim() || searchCards(loan.items.flatMap((i) => (i.card ? [i.card] : [])), filter.cards).length > 0)
  )
}

const names = (list: string[]) => [...new Set(list)].sort((a, b) => a.localeCompare(b))

/** Every loan, out and returned, through one filter that applies to both lists. */
export function useLoans() {
  const loans = useQuery(api.loans.list)
  const [filter, setFilter] = useState<LoanFilter>({ lender: "", borrower: "", cards: "" })
  const shown = filterLoans(loans ?? [], filter)
  return {
    loading: loans === undefined,
    out: shown.filter((l) => l.returnedAt === undefined),
    returned: shown.filter((l) => l.returnedAt !== undefined),
    filter,
    setFilter: (change: Partial<LoanFilter>) => setFilter((current) => ({ ...current, ...change })),
    filtering: filter.lender !== "" || filter.borrower !== "" || filter.cards.trim() !== "",
    // Everyone who has lent or borrowed, members or not, to pick from. Nobody lends to themselves,
    // so whoever is picked on one side is left out of the other.
    lenders: names((loans ?? []).map((l) => l.lender.name)).filter((name) => name !== filter.borrower),
    borrowers: names((loans ?? []).map((l) => l.borrower.name)).filter((name) => name !== filter.lender),
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

/** The mark for a card that saving will add to your collection, and its short form for a narrow screen. */
export const poolNote = "New to your collection"
export const poolNoteShort = "New"

export function poolSummary(count: number) {
  if (count === 0) return ""
  return "Heads up: one or more of these aren't in your collection yet, so we'll add them when you save."
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

  // Your collection as the server sees it, so the draft follows the same rules: a card from it can be
  // lent only up to its free copies (what isn't already out), and a card that isn't in it joins it.
  const offers = new Map(pool?.filter((r) => r.ownerId === me?._id).map((r) => [r.cardId as string, r]))
  const freeOf = (card: Card) => {
    const offer = offers.get(card._id)
    return offer && freeCopies({ offered: offer.quantity, lent: offer.lent })
  }

  const addCard = (card: Card) => {
    const free = freeOf(card)
    if (free === 0) {
      setError("Every copy of " + card.name + " in your collection is lent out")
      return
    }
    setError("")
    setItems((current) =>
      current.some((i) => i.card._id === card._id)
        ? current.map((i) => (i.card._id === card._id ? { ...i, quantity: Math.min(free ?? 99, i.quantity + 1) } : i))
        : [...current, { card, quantity: 1 }]
    )
  }
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

  // What saving will add to your collection, and how many copies each card can take, worked out the same way the server does it.
  const withPoolNotes = items.map((item) => {
    const offer = offers.get(item.card._id)
    const change = poolTopUp({ cardId: item.card._id, quantity: item.quantity }, { offered: offer?.quantity, lent: offer?.lent ?? 0 })
    const free = freeOf(item.card)
    return {
      ...item,
      poolNote: change && poolNote,
      poolNoteShort: change && poolNoteShort,
      /** Free copies of this card in your collection; undefined when the card isn't in it. */
      free,
      /** The most copies this loan can take. */
      max: free ?? 99,
    }
  })

  return {
    borrower,
    setBorrower,
    // You're always the lender, so you're never offered as the borrower.
    borrowerOptions: members.filter((m) => m._id !== me?._id).map((m) => ({ value: m._id as string, label: m.name })),
    items: withPoolNotes,
    poolSummary: poolSummary(withPoolNotes.filter((i) => i.poolNote).length),
    // Your own collection, offered before you type: what you're most likely lending. Cards already on
    // the loan, and cards with every copy lent out, are left out.
    myCardIds: [...offers.values()]
      .filter((r) => r.card && r.quantity > r.lent && !items.some((i) => i.card._id === r.cardId))
      .sort((a, b) => (a.card?.name ?? "").localeCompare(b.card?.name ?? ""))
      .map((r) => r.cardId as string),
    addCard,
    setQuantity,
    removeCard,
    error,
    save,
  }
}
