export type CatalogCard = { _id: string; name: string; set: string; number: string; imageUrl: string }

export const cardLabel = (card: Pick<CatalogCard, "name" | "set" | "number">) =>
  `${card.name} · ${card.set} ${card.number}`

/** Every typed word must appear in the name, set or number; names starting with the query rank first. */
export function searchCards<C extends CatalogCard>(cards: C[], query: string, limit = 30) {
  const q = query.trim().toLowerCase()
  const words = q.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return cards
    .filter((card) => {
      const haystack = `${card.name} ${card.set} ${card.number}`.toLowerCase()
      return words.every((word) => haystack.includes(word))
    })
    .sort(
      (a, b) =>
        Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, limit)
}
