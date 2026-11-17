"use client"

import Image from "next/image"
import { cardLabel, useCardPicker, type Card } from "@/core/cards"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/kits/keyframery/ui/combobox"

export function CardThumb({ src, size = 40 }: { src: string; size?: number }) {
  // Card art is 744×1039; alt is empty because the card's name always sits next to it.
  return <Image src={src} alt="" width={size} height={Math.round((size * 1039) / 744)} className="rounded-[3px]" />
}

export function CardSearch({ label, onPick }: { label: string; onPick: (card: Card) => void }) {
  const picker = useCardPicker(onPick)
  return (
    <Combobox value={null} onValueChange={picker.pick} query={picker.query} onQueryChange={picker.setQuery} filter={false}>
      <div className="flex flex-col gap-1.5">
        <ComboboxLabel>{label}</ComboboxLabel>
        <ComboboxInput placeholder={picker.loading ? "Loading cards…" : "Type a card name, set or number"} />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>{picker.query.trim() ? "No matches" : "Start typing to search"}</ComboboxEmpty>
        <ComboboxList>
          {picker.results.map((option) => (
            <ComboboxItem key={option.value} value={option.value} label={option.label}>
              <span className="flex items-center gap-2">
                <CardThumb src={option.imageUrl} size={24} />
                {option.label}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function CardList({ items }: { items: { quantity: number; card: Card | null }[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={item.card?._id ?? i} className="flex items-center gap-2">
          {item.card && <CardThumb src={item.card.imageUrl} size={24} />}
          <span>
            {item.card ? cardLabel(item.card) : "Unknown card"}
            {item.quantity > 1 && <span className="text-muted-foreground"> ×{item.quantity}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
