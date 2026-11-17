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
  lenderId: string
  items: { cardId: string; quantity: number }[]
  returnedAt?: number
}

/** Copies of each card each person has out on loans not yet returned, keyed `${ownerId}:${cardId}`. */
export function lentOut(loans: LoanLike[]) {
  const out = new Map<string, number>()
  for (const loan of loans) {
    if (loan.returnedAt !== undefined) continue
    for (const item of loan.items) {
      const key = `${loan.lenderId}:${item.cardId}`
      out.set(key, (out.get(key) ?? 0) + item.quantity)
    }
  }
  return out
}

export function assertQuantity(quantity: number, min = 1) {
  if (!Number.isInteger(quantity) || quantity < min || quantity > 99)
    throw new Error(`Quantity must be a whole number from ${min} to 99`)
}
