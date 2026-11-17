"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { cardMeta, useCardPicker, type Card } from "@/core/cards"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/kits/keyframery/ui/combobox"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/kits/keyframery/ui/item"

export function CardThumb({ src, size = 40 }: { src: string; size?: number }) {
  // Card art is 744×1039; alt is empty because the card's name always sits next to it.
  return <Image src={src} alt="" width={size} height={Math.round((size * 1039) / 744)} className="shrink-0 rounded-[3px]" />
}

/** A card as it sits in a list or table cell: art, then name over its printing. */
export function CardCell({ card, children }: { card: Card; children?: ReactNode }) {
  return (
    // Narrow tables scroll sideways rather than squeezing a card name into the next column.
    <Item className="min-w-48">
      <ItemMedia>
        <CardThumb src={card.imageUrl} size={28} />
      </ItemMedia>
      <CardName card={card}>{children}</CardName>
    </Item>
  )
}

/** A card's name, with its printing (and any note) on a quieter line underneath. Goes inside an Item. */
export function CardName({ card, children }: { card: Card; children?: ReactNode }) {
  return (
    <ItemContent>
      <ItemTitle>{card.name}</ItemTitle>
      <ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {cardMeta(card)}
        {children}
      </ItemDescription>
    </ItemContent>
  )
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
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={item.card?._id ?? i}>
          {item.card ? (
            <CardCell card={item.card}>{item.quantity > 1 && <span>× {item.quantity}</span>}</CardCell>
          ) : (
            "Unknown card"
          )}
        </li>
      ))}
    </ul>
  )
}
