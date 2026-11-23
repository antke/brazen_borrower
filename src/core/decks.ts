import { useMutation, useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import {
  STATUSES,
  baseName,
  buyList,
  cardKey,
  deckIssues,
  deckText,
  deckTitle,
  parseDeckText,
  resolveDeck,
  zoneProblem,
  type DeckLine,
  type DeckStatus,
  type DeckZone,
  type ParsedLine,
} from "../../convex/lib/decks"
import { cardMeta, type Card } from "./cards"
import { decodeDeckCode, encodeDeckCode, parseCardCode } from "./deck-code"
import { errorMessage } from "./format"
import { labels } from "./labels"
import { notify } from "./notices"
import { useMyLoans } from "./loans"

export { STATUSES, ZONES, baseName, buyList, deckIssues, deckText, deckTitle, type DeckStatus, type DeckZone } from "../../convex/lib/decks"

/** A printing's code in deck codes: "OGN-007a", "RAD-R01" (upper-cased so the two sides compare). */
const cardCode = (card: { set: string; number: string }) => `${card.set}-${card.number}`.toUpperCase()

/** The deck as a deck code. A printing the format can't carry (a promo set, a third alternate art) goes in as another
    printing of the same card from `catalogue`, the plainest first. Throws when a card has none. */
export function deckCode(lines: DeckLine<Card>[], catalogue: Card[]) {
  const codeOf = (card: Card) => {
    if (parseCardCode(cardCode(card))) return cardCode(card)
    const other = catalogue
      .filter((c) => baseName(c.name) === baseName(card.name) && parseCardCode(cardCode(c)))
      .sort((a, b) => a.name.length - b.name.length)[0]
    if (!other) throw new Error(`${baseName(card.name)} has no printing a deck code can carry`)
    return cardCode(other)
  }
  const sum = (zones: DeckZone[]) => {
    const counts = new Map<string, number>()
    for (const l of lines) if (zones.includes(l.zone)) counts.set(codeOf(l.card), (counts.get(codeOf(l.card)) ?? 0) + l.quantity)
    return [...counts].map(([code, count]) => ({ code, count }))
  }
  const champion = lines.find((l) => l.zone === "champion")?.card
  // The legend, chosen champion, runes and battlefields all ride in the code's main deck; the card's type sorts them back out.
  return encodeDeckCode({
    main: sum(["legend", "champion", "main", "rune", "battlefield"]),
    side: sum(["side"]),
    champion: champion && codeOf(champion),
  })
}

/** Whether pasted text is a deck code rather than a list: one word of base32 letters. */
export const isDeckCode = (text: string) => /^[A-Z2-7]{8,}$/i.test(text.trim())

/** A deck code as parsed lines named by card code, for resolveDeck with a finder by code. The chosen champion is one of
    the main deck's copies, so it moves out of there. */
export function parseDeckCode(text: string): ParsedLine[] {
  // shortcut: a v6 code's additional legends (a Neeko deck's) are left out; decks here hold one legend.
  const { main, side, champion } = decodeDeckCode(text)
  const lines: ParsedLine[] = [...main.map((c) => ({ name: c.code, quantity: c.count })), ...side.map((c) => ({ name: c.code, quantity: c.count, zone: "side" as const }))]
  if (champion) {
    const from = lines.find((l) => !l.zone && l.name === champion)
    if (from) from.quantity--
    lines.push({ name: champion, quantity: 1, zone: "champion" })
  }
  return lines.filter((l) => l.quantity > 0)
}

/** A saved deck's exports: the sectioned list, a buy list, and its deck code (or why it has none). */
export function useDeckExports(lines: DraftLine[]) {
  const catalogue = useQuery(api.catalog.list)
  let code = ""
  let codeProblem = ""
  try {
    code = deckCode(lines, catalogue ?? [])
  } catch (e) {
    // Only a fallback printing needs the catalogue, so a code usually comes before it loads.
    codeProblem = catalogue === undefined ? "Loading…" : errorMessage(e)
  }
  return { text: deckText(lines), buyList: buyList(lines), code, codeProblem }
}

export type Deck = NonNullable<ReturnType<typeof useQuery<typeof api.decks.mine>>>[number]
/** Copies of a card in a zone that share a status; a card whose copies differ (2 available, 1 posted) has a line for each. */
export type DraftLine = DeckLine<Card> & { status: DeckStatus }

/** The colours, in the order the game prints them. */
export const DOMAINS = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"] as const
export const CARD_TYPES = ["Unit", "Spell", "Gear"] as const

/** What the builder browses: one step of building a deck each, plus pasting a list in. */
export const BROWSE = [
  { value: "legend", label: "Legends" },
  { value: "champion", label: "Champions" },
  { value: "cards", label: "Cards" },
  { value: "rune", label: "Runes" },
  { value: "battlefield", label: "Battlefields" },
] as const
export type Browse = (typeof BROWSE)[number]["value"]
const browseZone: Record<Browse, DeckZone> = { legend: "legend", champion: "champion", cards: "main", rune: "rune", battlefield: "battlefield" }

export type DeckFilters = { query: string; domains: string[]; type: string; owned: boolean }
const MAX_COPIES = 3
const RUNES = 12
const BATTLEFIELDS = 3
const NO_FILTERS: DeckFilters = { query: "", domains: [], type: "", owned: false }

/** Copies of a deck's cards in each status that isn't in hand (not available or borrowed), for a quiet summary. */
export function statusCounts(lines: { quantity: number; status: DeckStatus }[]) {
  const counts = new Map<DeckStatus, number>()
  for (const l of lines) if (!IN_HAND.includes(l.status)) counts.set(l.status, (counts.get(l.status) ?? 0) + l.quantity)
  return counts
}

/** Copies of one card in each status. */
export type StatusCopies = Record<DeckStatus, number>

/** A card's lines (one per status) as its copies in each status. */
export const copiesOf = (lines: { quantity: number; status: DeckStatus }[]): StatusCopies =>
  Object.fromEntries(STATUSES.map(({ status }) => [status, lines.find((l) => l.status === status)?.quantity ?? 0])) as StatusCopies

/** A card's copies brought to `quantity` in all, for editing several cards at once: fewer come off the end of STATUSES
    (not in collection first), more join the card's first status. `status`, if given, then takes every copy. */
export function resizeCopies(copies: StatusCopies, quantity: number, status?: DeckStatus): StatusCopies {
  const next = { ...copies }
  let total = Object.values(next).reduce((sum, n) => sum + n, 0)
  for (const { status: from } of [...STATUSES].reverse()) {
    const off = Math.min(Math.max(total - quantity, 0), next[from])
    next[from] -= off
    total -= off
  }
  if (quantity > total) next[STATUSES.find((s) => next[s.status] > 0)?.status ?? "available"] += quantity - total
  if (!status) return next
  return { ...Object.fromEntries(STATUSES.map((s) => [s.status, 0])), [status]: quantity } as StatusCopies
}

/** A deck with a card's copies in a zone replaced by one printing and so many copies in each status (none takes it
    out), the card keeping its place. */
function withCard(lines: DraftLine[], card: Card, zone: DeckZone, printing: Card, copies: StatusCopies) {
  const isCard = (l: DraftLine) => baseName(l.card.name) === baseName(card.name) && l.zone === zone
  const at = lines.findIndex(isCard)
  const rest = lines.filter((l) => !isCard(l))
  const group = STATUSES.filter(({ status }) => copies[status] > 0).map(({ status }) => ({ card: printing, quantity: copies[status], zone, status }))
  // Lines before the card's first are all other cards', so its index in `rest` is the same.
  rest.splice(at < 0 ? rest.length : at, 0, ...group)
  return rest
}

/** The member's copies of a card, by name (every printing counts): free to use, and out on loan. */
export type Holding = { free: number; borrowed: number; lent: number }
export const NO_HOLDING: Holding = { free: 0, borrowed: 0, lent: 0 }

/** Where each status's copies come from in the member's hands, in the order a deck takes them: their own free copies,
    then copies borrowed from someone, then their own out on loan. Copies past those are not in their collection. */
const SOURCES: [DeckStatus, keyof Holding][] = [
  ["available", "free"],
  ["borrowed", "borrowed"],
  ["lent", "lent"],
]

/** Statuses that mean the copy is in the member's hands: a deck with only these is ready to play. */
export const IN_HAND: DeckStatus[] = ["available", "borrowed"]

/** The member's copies by card name: `rows` from their collection (free and lent per printing), `borrowed` the cards
    in their open loans as borrower. */
export function holdingsByName(
  rows: { card: { name: string } | null; available: number; lent: number }[],
  borrowed: { card: { name: string } | null; quantity: number }[] = []
) {
  const holdings = new Map<string, Holding>()
  const add = (card: { name: string } | null, more: Partial<Holding>) => {
    if (!card) return
    const held = holdings.get(baseName(card.name)) ?? NO_HOLDING
    holdings.set(baseName(card.name), {
      free: held.free + (more.free ?? 0),
      borrowed: held.borrowed + (more.borrowed ?? 0),
      lent: held.lent + (more.lent ?? 0),
    })
  }
  for (const { card, available, lent } of rows) add(card, { free: available, lent })
  for (const { card, quantity } of borrowed) add(card, { borrowed: quantity })
  return holdings
}

const copiesNamed = (lines: { card: { name: string }; quantity: number; status: DeckStatus }[], name: string, status: DeckStatus) =>
  lines.filter((l) => l.status === status && baseName(l.card.name) === name).reduce((sum, l) => sum + l.quantity, 0)

/** The status for one more copy of a card, so a deck never counts more copies than the member has: available while
    they have free copies the deck isn't using yet, then borrowed while copies they've borrowed are left, then lent
    while they have copies out on loan, then not in collection. (2 free, 1 lent: the 3rd copy is lent and a 4th not in
    collection.) Copies marked posted or awaiting don't count. */
export function nextStatus(card: { name: string }, lines: DraftLine[], holding: Holding): DeckStatus {
  const name = baseName(card.name)
  return SOURCES.find(([status, from]) => copiesNamed(lines, name, status) < holding[from])?.[0] ?? "missing"
}

/** A pasted list's statuses from the collection, the same way, card by card in list order. */
export function statusesFromCollection<C extends { name: string }>(lines: DeckLine<C>[], holdings: Map<string, Holding>) {
  const used = new Map<string, Holding>()
  return lines.flatMap((line) => {
    const name = baseName(line.card.name)
    const held = holdings.get(name) ?? NO_HOLDING
    const taken = { ...(used.get(name) ?? NO_HOLDING) }
    let left = line.quantity
    const split: [DeckStatus, number][] = SOURCES.map(([status, from]) => {
      const n = Math.min(left, held[from] - taken[from])
      taken[from] += n
      left -= n
      return [status, n]
    })
    used.set(name, taken)
    split.push(["missing", left])
    return split.filter(([, n]) => n > 0).map(([status, quantity]) => ({ ...line, quantity, status }))
  })
}

/** The cards to look over before a save: any with a copy that isn't in hand (lent, in the post, not in collection),
    and any whose name has more copies marked available, borrowed or lent across the deck than the member has (so a
    copy would be counted twice). Each card is its lines in one zone. */
export function cardsToReview(lines: DraftLine[], holdings: Map<string, Holding>) {
  const overused = (name: string) => SOURCES.some(([status, from]) => copiesNamed(lines, name, status) > (holdings.get(name) ?? NO_HOLDING)[from])
  return [...Map.groupBy(lines, (l) => l.zone + baseName(l.card.name)).values()].filter(
    (group) => group.some((l) => !IN_HAND.includes(l.status)) || overused(baseName(group[0].card.name))
  )
}

/** One copy of a card moved, keeping how many there are: `+1` moves a copy into `status` (from not in collection if
    there are any, otherwise from the other statuses, last in STATUSES first); `-1` moves one of its copies back to not
    in collection, the place for copies nobody has placed. */
export function shiftCopy(copies: StatusCopies, status: DeckStatus, by: 1 | -1): StatusCopies {
  const [from, to] = by === 1 ? [[...STATUSES].reverse().find((s) => s.status !== status && copies[s.status] > 0)?.status, status] : [status, "missing" as const]
  if (!from || from === to || copies[from] === 0) return copies
  return { ...copies, [from]: copies[from] - 1, [to]: copies[to] + 1 }
}

/** A card's copies with one status set to `quantity`, for steppers that move copies around freely: past `max` copies in
    all, the extra come out of the other statuses (available first, in STATUSES order), so nothing needs lowering first. */
export function moveCopies(copies: StatusCopies, status: DeckStatus, quantity: number, max: number): StatusCopies {
  const next = { ...copies, [status]: quantity }
  let over = Object.values(next).reduce((sum, n) => sum + n, 0) - max
  for (const { status: other } of STATUSES) {
    if (over <= 0) break
    if (other === status) continue
    const off = Math.min(over, next[other])
    next[other] -= off
    over -= off
  }
  return next
}

/** One printing of a card among the others: its note (or "Standard") and where it was printed, "Alternate Art · OGN 066a". */
export const printingLabel = (card: Card) => `${/ \(([^)]*)\)$/.exec(card.name)?.[1] ?? "Standard"} · ${cardMeta(card)}`

export const deckLines =(deck: Deck): DraftLine[] => deck.cards.flatMap((l) => (l.card ? [{ ...l, card: l.card }] : []))

export function useMyDecks() {
  const decks = useQuery(api.decks.mine)
  const remove = useMutation(api.decks.remove)
  return {
    loading: decks === undefined,
    decks: decks ?? [],
    remove: (deck: Deck) =>
      void remove({ id: deck._id }).then(() => notify({ title: labels.deckDeleted(deckTitle(deck.name, deckLines(deck))) })),
  }
}

/** Finds a card by the name a list gives: the exact printing ("Ahri, Alluring (Alternate Art)") or, by its base name,
    the best printing of it. */
export function cardFinder(catalogue: Card[], owned: Map<string, number> = new Map()) {
  const exact = new Map(catalogue.map((c) => [cardKey(c.name), c]))
  const byName = new Map([...printingsByName(catalogue, owned).values()].map(([best]) => [cardKey(baseName(best.name)), best]))
  return (name: string) => exact.get(cardKey(name)) ?? byName.get(cardKey(baseName(name)))
}

/** Reads a pasted list of "3 Card Name" lines into cards and copies, one entry per card; names it can't find go to
    `unknown`. Throws on a line it can't read. */
export function readCardList(text: string, find: (name: string) => Card | undefined) {
  const items = new Map<string, { card: Card; quantity: number }>()
  const unknown: string[] = []
  for (const { name, quantity } of parseDeckText(text)) {
    const card = find(name)
    if (!card) unknown.push(name)
    else items.set(card._id, { card, quantity: (items.get(card._id)?.quantity ?? 0) + quantity })
  }
  return { items: [...items.values()], unknown }
}

/** Every card's printings (alternate arts, overnumbered, promos…) by its name, best first: the member's own copy if they
    have one, otherwise the plainest printing. The first of each is the one the builder shows. */
function printingsByName(cards: Card[], owned: Map<string, number>) {
  const better = (a: Card, b: Card) =>
    Number(owned.has(b._id)) - Number(owned.has(a._id)) ||
    a.name.length - b.name.length ||
    a.number.length - b.number.length ||
    a.number.localeCompare(b.number)
  const byName = Map.groupBy(cards, (card) => baseName(card.name))
  for (const printings of byName.values()) printings.sort(better)
  return new Map([...byName].sort(([a], [b]) => a.localeCompare(b)))
}

/** A deck being built or edited: what to browse, the cards so far, and saving, importing and exporting it. */
export function useDeckDraft(deck?: Deck) {
  const catalogue = useQuery(api.catalog.list)
  const collection = useQuery(api.pool.mine)
  const saveDeck = useMutation(api.decks.save)
  const [name, setName] = useState(deck?.name ?? "")
  const [lines, setLines] = useState<DraftLine[]>(() => (deck ? deckLines(deck) : []))
  const [browse, setBrowse] = useState<Browse>("legend")
  const [filters, setFilters] = useState<DeckFilters>(NO_FILTERS)
  const [error, setError] = useState("")

  const owned = useMemo(() => new Map(collection?.map((r) => [r.cardId as string, r.available]) ?? []), [collection])
  // Cards borrowed from someone are in hand too: they come after the member's own free copies.
  const myLoans = useMyLoans()
  const borrowedCards = useMemo(() => myLoans.borrowed.flatMap((loan) => loan.items), [myLoans.borrowed])
  const holdings = useMemo(() => holdingsByName(collection ?? [], borrowedCards), [collection, borrowedCards])
  const holding = (card: Card) => holdings.get(baseName(card.name)) ?? NO_HOLDING
  const printings = useMemo(() => printingsByName(catalogue ?? [], owned), [catalogue, owned])
  const cards = useMemo(() => [...printings.values()].map(([best]) => best), [printings])
  const legend = lines.find((l) => l.zone === "legend")?.card
  const issues = deckIssues(lines)

  const zone = browseZone[browse]
  // Once a legend leads the deck, only its colours are on offer: the other colour filters go, and so does any left picked.
  const domainChoices = legend && browse !== "legend" ? DOMAINS.filter((d) => legend.domains?.includes(d)) : [...DOMAINS]
  const picked = filters.domains.filter((d) => (domainChoices as string[]).includes(d))
  const words = cardKey(filters.query).split(" ").filter(Boolean)
  const results = cards.filter(
    (card) =>
      zoneProblem(card, zone, legend) === null &&
      // Before the catalogue knows a card's type, it can't be sorted into a step; leave it out.
      card.type !== undefined &&
      words.every((w) => cardKey(card.name).includes(w)) &&
      // A legend has every colour picked (two colours find its pair); other cards have any of them.
      (picked.length === 0 || picked[browse === "legend" ? "every" : "some"]((d) => card.domains?.includes(d))) &&
      (browse !== "cards" || !filters.type || card.type === filters.type) &&
      // Any printing counts: an alternate art of a card plays the same as the one shown.
      (!filters.owned || Object.values(holding(card)).some((n) => n > 0))
  )

  const count = (zone: DeckZone) => lines.filter((l) => l.zone === zone).reduce((sum, l) => sum + l.quantity, 0)
  const inDeck = (card: Card) =>
    lines
      .filter((l) => baseName(l.card.name) === baseName(card.name) && (l.zone === "champion" || l.zone === "main" || l.zone === "side"))
      .reduce((sum, l) => sum + l.quantity, 0)

  /** More copies of a card that fit in a zone: 3 of a name across the chosen champion, main deck and sideboard,
      the rest of the 12 runes, and one each of 3 different battlefields. A legend or champion pick replaces the last. */
  function room(card: Card, zone: DeckZone) {
    if (zone === "main" || zone === "side") return Math.max(0, MAX_COPIES - inDeck(card))
    if (zone === "rune") return Math.max(0, RUNES - count("rune"))
    if (zone === "battlefield")
      return lines.some((l) => l.zone === zone && baseName(l.card.name) === baseName(card.name)) ? 0 : Math.max(0, BATTLEFIELDS - count(zone))
    return 1
  }

  // A card in a zone is every printing of its name there: an added copy joins the printing already in the deck, and
  // the deck shows the name once (its printing is picked in the card's dialog, see setCard).
  const isCard = (l: DraftLine, card: Card, zone: DeckZone) => baseName(l.card.name) === baseName(card.name) && l.zone === zone

  function add(card: Card, to: DeckZone) {
    if (room(card, to) === 0) return
    setError("")
    setLines((current) => {
      // One legend and one chosen champion: picking another replaces it. A new legend drops a champion that no longer fits.
      if (to === "legend" || to === "champion") {
        const kept = current.filter((l) => l.zone !== to && !(to === "legend" && l.zone === "champion" && zoneProblem(l.card, "champion", card)))
        return [...kept, { card, quantity: 1, zone: to, status: nextStatus(card, kept, holding(card)) }]
      }
      const status = nextStatus(card, current, holding(card))
      const same = current.find((l) => isCard(l, card, to) && l.status === status)
      if (same) return current.map((l) => (l === same ? { ...l, quantity: l.quantity + 1 } : l))
      const printing = current.find((l) => isCard(l, card, to))?.card ?? card
      return [...current, { card: printing, quantity: 1, zone: to, status }]
    })
  }

  return {
    // The collection decides each added copy's status, so nothing goes in before it has loaded too.
    loading: catalogue === undefined || collection === undefined || myLoans.loading,
    name,
    setName,
    title: deckTitle(name, lines),
    lines,
    legend,
    issues,
    browse,
    setBrowse,
    filters,
    setFilters: (change: Partial<DeckFilters>) => setFilters((current) => ({ ...current, ...change })),
    results,
    /** The colours worth filtering by: every colour, or the legend's two once there is one. */
    domainChoices,
    /** Copies of a card (by name) already in the main deck, chosen champion and sideboard. */
    inDeck,
    room,
    /** The most copies of a card in a zone, whatever their status, given the rest of the deck. */
    maxCopies: (card: Card, zone: DeckZone) => lines.filter((l) => isCard(l, card, zone)).reduce((sum, l) => sum + l.quantity, 0) + room(card, zone),
    add,
    /** A card's printings, best first (just the card when it has one); `printingLabel` tells them apart. */
    versions: (card: Card) => printings.get(baseName(card.name)) ?? [card],
    /** Replaces a card's copies in a zone with one printing and so many copies in each status (none at all takes it
        out), keeping its place in the deck. What the card's dialog saves on Done. */
    setCard: (card: Card, zone: DeckZone, printing: Card, copies: StatusCopies) =>
      setLines((current) => withCard(current, card, zone, printing, copies)),
    /** Sets several cards' copies at once (a review before saving) and gives back the deck as it now is. */
    setCards,
    /** Sets several cards' copies and saves the deck straight away: the deck viewer's status changes. */
    saveCards: (changes: CardChange[]) => save(setCards(changes)),
    /** The member's copies of a card in their collection (every printing counts). */
    holding,
    /** The cards to look over before saving; none means every copy is available and in the collection. */
    toReview: cardsToReview(lines, holdings),
    /** Every copy of a card out of a zone. */
    remove: (card: Card, zone: DeckZone) => setLines((current) => current.filter((l) => !isCard(l, card, zone))),
    /** One copy out; the last copy takes the card out of the deck. */
    removeOne: (line: DraftLine) =>
      setLines((current) => (line.quantity > 1 ? current.map((l) => (l === line ? { ...l, quantity: l.quantity - 1 } : l)) : current.filter((l) => l !== line))),
    error,
    /** Replaces the deck with a pasted list. Resolves to an error message, or "" once it's in. */
    /** Replaces the deck with a pasted list, its statuses from the collection. `imported` says whether it went in;
        `problem` is why not, or which cards were left out; `review` says some copies aren't in hand (lent, or missing). */
    importText(text: string): { imported: boolean; problem: string; review: boolean } {
      try {
        // A list names a card ("Ahri, Alluring") or, now and then, one printing of it ("Ahri, Alluring (Alternate Art)");
        // a deck code names printings by card code.
        const byCode = new Map((catalogue ?? []).map((c) => [cardCode(c), c]))
        const { lines: found, unknown } = isDeckCode(text)
          ? resolveDeck(parseDeckCode(text), (code) => byCode.get(code))
          : resolveDeck(parseDeckText(text), cardFinder(catalogue ?? [], owned))
        if (found.length === 0) return { imported: false, problem: "No cards found in that list", review: false }
        const imported = statusesFromCollection(found, holdings)
        setLines(imported)
        setError("")
        return { imported: true, problem: unknown.length ? `Not found, so left out: ${unknown.join(", ")}` : "", review: cardsToReview(imported, holdings).length > 0 }
      } catch (e) {
        return { imported: false, problem: errorMessage(e), review: false }
      }
    },
    text: () => deckText(lines),
    /** Saves the deck, or `using`: the deck with changes made just now (a review's), which state hasn't caught up with. */
    save,
  }

  function setCards(changes: CardChange[]) {
    const next = changes.reduce((deck, { card, zone, copies }) => withCard(deck, card, zone, card, copies), lines)
    setLines(next)
    return next
  }

  async function save(using = lines) {
    try {
      await saveDeck({
        id: deck?._id as Id<"decks"> | undefined,
        name,
        cards: using.map((l) => ({ cardId: l.card._id, quantity: l.quantity, zone: l.zone, status: l.status })),
      })
      setError("")
      notify({ title: labels.deckSaved(deckTitle(name, using)) })
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }
}

type CardChange = { card: Card; zone: DeckZone; copies: StatusCopies }

export type DeckDraft = ReturnType<typeof useDeckDraft>
