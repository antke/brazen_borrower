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

/**
 * How a member's pool must change so they actually have the cards they're lending: a card that isn't offered
 * is added, and an offer with too few free copies is raised to cover what's out plus this loan (99 at most).
 */
export function poolTopUp(
  item: { cardId: string; quantity: number },
  pool: { offered?: number; lent: number }
): { from: number; to: number } | null {
  const needed = Math.min(99, pool.lent + item.quantity)
  const offered = pool.offered ?? 0
  return offered >= needed ? null : { from: offered, to: needed }
}

export function assertQuantity(quantity: number, min = 1) {
  if (!Number.isInteger(quantity) || quantity < min || quantity > 99)
    throw new Error(`Quantity must be a whole number from ${min} to 99`)
}
