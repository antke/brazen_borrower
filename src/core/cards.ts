import { useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"

export type Card = Doc<"cards">
export type CatalogCard = { _id: string; name: string; set: string; number: string; imageUrl: string }

export const cardLabel = (card: Pick<CatalogCard, "name" | "set" | "number">) =>
  `${card.name} · ${card.set} ${card.number}`

/** The printing, for showing under a card's name: "SFD 025". */
export const cardMeta = (card: Pick<CatalogCard, "set" | "number">) => `${card.set} ${card.number}`

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

/**
 * A search-and-pick card field's state, for a Combobox with `value={null}`, `filter={false}`,
 * `query`/`onQueryChange` and `onValueChange={pick}`. The whole catalogue loads once, so typing never waits.
 * With an empty query it lists `suggestions` (card ids), so a likely card is one arrow key away.
 */
export function useCardPicker(onPick: (card: Card) => void, suggestions: string[] = []) {
  const catalogue = useQuery(api.catalog.list)
  const options = useMemo(
    () => catalogue?.map((card) => ({ ...card, value: card._id as string, label: cardLabel(card), card })) ?? [],
    [catalogue]
  )
  const byId = useMemo(() => new Map(options.map((o) => [o.value, o])), [options])
  const [query, setQuery] = useState("")
  const typing = query.trim() !== ""
  return {
    loading: catalogue === undefined,
    query,
    setQuery,
    /** True while the field is empty and showing `suggestions` instead of search results. */
    suggesting: !typing && suggestions.length > 0,
    results: typing ? searchCards(options, query) : suggestions.flatMap((id) => byId.get(id) ?? []),
    pick(value: unknown) {
      // Looked up in the whole catalogue: the combobox can clear the query before it reports the pick.
      const option = options.find((o) => o.value === value)
      if (option) onPick(option.card)
      setQuery("")
    },
  }
}
