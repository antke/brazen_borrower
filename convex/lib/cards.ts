export type RiftHuntCard = {
  printing_id: string
  riftboundId: string
  name: string
  set: string
  rarity: string
  imgUrl: string
}

export function toCard(raw: RiftHuntCard) {
  return {
    printingId: raw.printing_id,
    name: raw.name,
    set: raw.set.toUpperCase(),
    // "ogn-007a-298" -> "007a"; Riot's id is the only place the printed number keeps its letter suffix.
    number: raw.riftboundId.split("-")[1] ?? "",
    rarity: raw.rarity,
    imageUrl: raw.imgUrl,
  }
}

export type LoanLike = {
  lender: { userId?: string }
  items: { cardId: string; quantity: number }[]
  returnedAt?: number
}

/** Copies of each card each member has out on loans not yet returned, keyed `${ownerId}:${cardId}`. */
export function lentOut(loans: LoanLike[]) {
  const out = new Map<string, number>()
  for (const loan of loans) {
    // Only members have pool cards; a loan from someone outside the app can't reduce one.
    if (loan.returnedAt !== undefined || loan.lender.userId === undefined) continue
    for (const item of loan.items) {
      const key = `${loan.lender.userId}:${item.cardId}`
      out.set(key, (out.get(key) ?? 0) + item.quantity)
    }
  }
  return out
}

/** A member's holding of one card: copies in their collection (none when it isn't there) and copies lent out. */
type Holding = { offered?: number; lent: number }

/**
 * Lending a card that isn't in your collection adds it, with the copies you're lending (99 at most).
 * A card that is already there isn't topped up: you lend from the copies it has (see `freeCopies`).
 */
export function poolTopUp(item: { cardId: string; quantity: number }, pool: Holding): { from: number; to: number } | null {
  return pool.offered === undefined ? { from: 0, to: Math.min(99, pool.lent + item.quantity) } : null
}

/** Copies of a card in your collection that aren't lent out; undefined when it isn't in your collection. */
export function freeCopies(pool: Holding) {
  return pool.offered === undefined ? undefined : Math.max(0, pool.offered - pool.lent)
}

/** You can lend a card from your collection only up to its free copies; copies already lent are out of reach. */
export function assertCanLend(item: { quantity: number }, pool: Holding, name: string) {
  const free = freeCopies(pool)
  if (free === undefined || item.quantity <= free) return
  throw new Error(
    free === 0
      ? "Every copy of " + name + " in your collection is lent out"
      : "Only " + free + " of your copies of " + name + " are free to lend"
  )
}

/** Your collection can't drop below what's lent out: those copies have to come back (be marked returned) first. */
export function assertCanSetCopies(quantity: number, lent: number, name: string) {
  if (quantity >= lent) return
  throw new Error(
    lent + (lent === 1 ? " copy" : " copies") + " of " + name + " " + (lent === 1 ? "is" : "are") +
      " lent out; mark " + (lent === 1 ? "it" : "them") + " returned before going below " + lent
  )
}

export function assertQuantity(quantity: number, min = 1) {
  if (!Number.isInteger(quantity) || quantity < min || quantity > 99)
    throw new Error(`Quantity must be a whole number from ${min} to 99`)
}

/** Splits a loan's cards into the copies coming back and the copies still out. Every returned card
    must be on the loan, and no more copies can come back than were lent. */
export function splitReturn<Id extends string>(
  lent: { cardId: Id; quantity: number }[],
  back: { cardId: Id; quantity: number }[]
) {
  const coming = new Map<Id, number>()
  for (const item of back) {
    assertQuantity(item.quantity)
    coming.set(item.cardId, (coming.get(item.cardId) ?? 0) + item.quantity)
  }
  for (const cardId of coming.keys())
    if (!lent.some((item) => item.cardId === cardId)) throw new Error("That card isn't on this loan")
  const returned: { cardId: Id; quantity: number }[] = []
  const stillOut: { cardId: Id; quantity: number }[] = []
  for (const item of lent) {
    const n = coming.get(item.cardId) ?? 0
    if (n > item.quantity) throw new Error("That's more copies than were lent")
    if (n > 0) returned.push({ cardId: item.cardId, quantity: n })
    if (item.quantity > n) stillOut.push({ cardId: item.cardId, quantity: item.quantity - n })
  }
  return { returned, stillOut }
}
