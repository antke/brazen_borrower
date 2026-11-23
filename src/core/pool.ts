import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { cardLabel, type Card } from "./cards"
import { cardFinder, readCardList } from "./decks"
import { errorMessage } from "./format"
import { labels } from "./labels"
import { useMyLoans } from "./loans"
import { cardsPhrase, notify } from "./notices"

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

export type CollectionView = "all" | "lent" | "borrowed"
/** A card in the member's hands: their own copies (`offer`, if they have any) and copies they've borrowed. */
export type CollectionRow = { cardId: string; card: Card | null; offer?: PoolRow; borrowed: number }

/** The member's collection plus the cards they're borrowing, one row per card. */
export function collectionRows(offers: PoolRow[], borrowed: { cardId: string; quantity: number; card: Card | null }[]) {
  const rows = new Map<string, CollectionRow>(offers.map((o) => [o.cardId, { cardId: o.cardId, card: o.card, offer: o, borrowed: 0 }]))
  for (const item of borrowed) {
    const row = rows.get(item.cardId) ?? { cardId: item.cardId, card: item.card, borrowed: 0 }
    rows.set(item.cardId, { ...row, borrowed: row.borrowed + item.quantity })
  }
  return [...rows.values()]
}

export const inView = (row: CollectionRow, view: CollectionView) =>
  view === "all" || (view === "lent" ? (row.offer?.lent ?? 0) > 0 : row.borrowed > 0)

export type CollectionSortKey = "name" | "copies" | "lent" | "borrowed" | "available"
export type CollectionSort = { key: CollectionSortKey; direction: "ascending" | "descending" }

const sortValue: Record<Exclude<CollectionSortKey, "name">, (row: CollectionRow) => number> = {
  copies: (r) => r.offer?.quantity ?? 0,
  lent: (r) => r.offer?.lent ?? 0,
  borrowed: (r) => r.borrowed,
  available: (r) => r.offer?.available ?? 0,
}
const byName = (a: CollectionRow, b: CollectionRow) => (a.card ? cardLabel(a.card) : "").localeCompare(b.card ? cardLabel(b.card) : "")

/** The rows in the picked order; equal rows keep name order. */
export function sortCollection(rows: CollectionRow[], { key, direction }: CollectionSort) {
  const sign = direction === "ascending" ? 1 : -1
  return rows.toSorted((a, b) => (key === "name" ? sign * byName(a, b) : sign * (sortValue[key](a) - sortValue[key](b)) || byName(a, b)))
}

export type CollectionFilter = { filter: string; type: string; domains: string[] }

/** A card passes when its label holds the text, it's the picked type, and it has any of the picked colours. */
export function matchesCollection(card: Card | null, { filter, type, domains }: CollectionFilter) {
  const words = filter.trim().toLowerCase()
  if (!words && !type && domains.length === 0) return true
  return (
    card !== null &&
    cardLabel(card).toLowerCase().includes(words) &&
    (!type || card.type === type) &&
    (domains.length === 0 || domains.some((d) => card.domains?.includes(d)))
  )
}

/** The signed-in member's own offers, and the controls to change them. */
export function useMyOffers() {
  const rows = useQuery(api.pool.mine)
  const catalogue = useQuery(api.catalog.list)
  const loans = useMyLoans()
  const [view, setView] = useState<CollectionView>("all")
  const [filter, setFilter] = useState("")
  const [type, setType] = useState("")
  const [domains, setDomains] = useState<string[]>([])
  const [sort, setSort] = useState<CollectionSort>({ key: "name", direction: "ascending" })
  const everything = collectionRows(rows ?? [], loans.borrowed.flatMap((l) => l.items))
  const all = everything.filter((r) => matchesCollection(r.card, { filter, type, domains }))
  const setOffer = useMutation(api.pool.set)
  const [copies, setCopies] = useState(1)
  const [error, setError] = useState("")

  /** Saves a card's copies; whether it worked (a failure shows in `error`). */
  async function save(cardId: Card["_id"], quantity: number, name = rows?.find((r) => r.cardId === cardId)?.card?.name ?? "A card") {
    const before = rows?.find((r) => r.cardId === cardId)?.quantity ?? 0
    try {
      await setOffer({ cardId, quantity })
      setError("")
      if (quantity === before) return true
      notify({
        title:
          before === 0
            ? labels.addedToCollection(cardsPhrase([{ name, quantity }]))
            : quantity === 0
              ? labels.removedFromCollection(name)
              : labels.copiesInCollection(name, quantity),
      })
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }

  return {
    loading: rows === undefined || loans.loading,
    rows: sortCollection(all.filter((r) => inView(r, view)), sort),
    /** How a column is sorted, in the values a sortable table header takes. */
    sortOf: (key: CollectionSortKey) => (sort.key === key ? sort.direction : "none"),
    sortBy: (key: CollectionSortKey, direction: "ascending" | "descending" | "none") =>
      setSort({ key, direction: direction === "descending" ? "descending" : "ascending" }),
    sort,
    /** Picks the column to sort by, keeping the direction. */
    setSortKey: (key: CollectionSortKey) => setSort({ ...sort, key }),
    flipSort: () => setSort({ ...sort, direction: sort.direction === "ascending" ? "descending" : "ascending" }),
    count: (v: CollectionView) => all.filter((r) => inView(r, v)).length,
    view,
    setView,
    filter,
    setFilter,
    type,
    setType,
    /** The card types in the collection, to pick from. */
    types: [...new Set(everything.flatMap((r) => (r.card?.type ? [r.card.type] : [])))].sort(),
    domains,
    setDomains,
    filtering: filter.trim() !== "" || type !== "" || domains.length > 0,
    copies,
    setCopies,
    error,
    // Adds to the copies already there. shortcut: reads the count the page has, so two adds of one card faster than
    // the query refreshes count once; move the sum into the mutation if that ever matters.
    /** Adds every card in a pasted list ("3 Card Name" lines) on top of the copies already there. `added` is what went
        in; `problem` says why the rest didn't (a line it can't read, names it can't find, a failed save). */
    async addList(text: string): Promise<{ added: { card: Card; quantity: number }[]; problem: string }> {
      let read
      try {
        read = readCardList(text, cardFinder(catalogue ?? [], new Map(rows?.map((r) => [r.cardId as string, r.available]))))
      } catch (e) {
        return { added: [], problem: errorMessage(e) }
      }
      const added: { card: Card; quantity: number }[] = []
      let problem = read.unknown.length ? `Not found, so left out: ${read.unknown.join(", ")}` : ""
      // shortcut: one save per card, not one transaction; a failure part-way keeps what's in and says so. Move to a bulk
      // mutation if lists get long.
      for (const item of read.items) {
        try {
          await setOffer({ cardId: item.card._id, quantity: (rows?.find((r) => r.cardId === item.card._id)?.quantity ?? 0) + item.quantity })
          added.push(item)
        } catch (e) {
          problem = `${errorMessage(e)}. Stopped at ${item.card.name}` + (problem ? `. ${problem}` : "")
          break
        }
      }
      if (added.length) notify({ title: labels.addedToCollection(cardsPhrase(added.map((a) => ({ name: a.card.name, quantity: a.quantity })))) })
      if (!added.length && !problem) problem = "No cards found in that list"
      return { added, problem }
    },
    offer: (card: Card) => save(card._id, (rows?.find((r) => r.cardId === card._id)?.quantity ?? 0) + copies, card.name),
    setRowCopies: (row: PoolRow, quantity: number) => save(row.cardId, quantity),
    withdraw: (row: PoolRow) => save(row.cardId, 0),
  }
}
