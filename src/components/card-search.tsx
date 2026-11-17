"use client"

import { useQuery } from "convex/react"
import { useMemo } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"
import { SearchField } from "@/components/ui/search-field"
import { cardLabel, searchCards } from "@/lib/search-cards"
import { CardThumb } from "./card-thumb"

export type Card = Doc<"cards">

export function CardSearch({ label, onPick }: { label: string; onPick: (card: Card) => void }) {
  const catalogue = useQuery(api.catalog.list)
  const items = useMemo(
    () => catalogue?.map((card) => ({ ...card, value: card._id, label: cardLabel(card), card })) ?? [],
    [catalogue]
  )
  return (
    <SearchField
      label={label}
      placeholder={catalogue ? "Type a card name, set or number" : "Loading cards…"}
      items={items}
      search={searchCards}
      onPick={(item) => onPick(item.card)}
      renderItem={(item) => (
        <span className="flex items-center gap-2">
          <CardThumb src={item.card.imageUrl} size={28} />
          {item.label}
        </span>
      )}
    />
  )
}

export function CardList({ items }: { items: { quantity: number; card: Card | null }[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={item.card?._id ?? i} className="flex items-center gap-2">
          {item.card && <CardThumb src={item.card.imageUrl} size={28} />}
          <span>
            {item.card ? cardLabel(item.card) : "Unknown card"}
            {item.quantity > 1 && <span className="text-neutral-600 dark:text-neutral-400"> ×{item.quantity}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
