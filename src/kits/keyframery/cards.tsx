"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { cardMeta, useCardPicker, type Card } from "@/core/cards"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/kits/keyframery/ui/combobox"
import { cn } from "@/kits/keyframery/lib/utils"
import { Badge } from "@/kits/keyframery/ui/badge"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/kits/keyframery/ui/item"

export function CardThumb({ src, size = 40, className }: { src: string; size?: number; className?: string }) {
  // Card art is 744×1039; alt is empty because the card's name always sits next to it. `className` only resizes it.
  return (
    <Image src={src} alt="" width={size} height={Math.round((size * 1039) / 744)} className={cn("shrink-0 rounded-[3px]", className)} />
  )
}

const PREVIEW = 216

/** A thumbnail that lifts the full printing beside it while the pointer rests on it or a finger holds it. */
function CardArt({ src, size }: { src: string; size: number }) {
  // Both images ask for the preview's width, so the thumbnail's download is the preview's too.
  const sizes = `${PREVIEW}px`
  return (
    <span data-slot="card-art">
      <Image src={src} alt="" width={size} height={Math.round((size * 1039) / 744)} sizes={sizes} />
      <span data-slot="card-art-preview" aria-hidden>
        <Image src={src} alt="" width={PREVIEW} height={Math.round((PREVIEW * 1039) / 744)} sizes={sizes} />
      </span>
    </span>
  )
}

/** A card as it sits in a list or table cell: art, then name over its printing. */
export function CardCell({ card, children }: { card: Card; children?: ReactNode }) {
  return (
    // From sm up, narrow tables scroll sideways rather than squeezing a card name into the next column;
    // phones show tables as lists, where the name gets the row's width and truncates.
    <Item className="sm:min-w-48">
      <ItemMedia>
        <CardArt src={card.imageUrl} size={32} />
      </ItemMedia>
      <CardName card={card}>{children}</CardName>
    </Item>
  )
}

/** A card's name, with its printing (and any note) on a quieter line underneath. Goes inside an Item. */
export function CardName({ card, children }: { card: Card; children?: ReactNode }) {
  return (
    <ItemContent>
      {/* One line, cut with "…" when the column is narrow; the full name shows on hover. */}
      <ItemTitle className="block max-w-full truncate" title={card.name}>
        {card.name}
      </ItemTitle>
      <ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {cardMeta(card)}
        {children}
      </ItemDescription>
    </ItemContent>
  )
}

/** One card in a search list: one line, a long name cut with "…" rather than wrapping. */
function CardOption({ option }: { option: { value: string; label: string; imageUrl: string } }) {
  return (
    <ComboboxItem value={option.value} label={option.label}>
      <span className="flex min-w-0 items-center gap-2">
        <CardThumb src={option.imageUrl} size={24} />
        <span className="min-w-0 truncate" title={option.label}>
          {option.label}
        </span>
      </span>
    </ComboboxItem>
  )
}

export function CardSearch({
  label,
  onPick,
  suggestions,
  suggestionsLabel,
}: {
  label: string
  onPick: (card: Card) => void
  /** Card ids listed, under `suggestionsLabel`, while nothing is typed. */
  suggestions?: string[]
  suggestionsLabel?: string
}) {
  const picker = useCardPicker(onPick, suggestions)
  return (
    <Combobox
      value={null}
      onValueChange={picker.pick}
      query={picker.query}
      // A pick fills the input with the card's label; skip that so the search stays empty for the next card.
      onQueryChange={(query, details) => details.reason !== "item-press" && picker.setQuery(query)}
      filter={false}
    >
      <div className="flex flex-col gap-1.5">
        <ComboboxLabel>{label}</ComboboxLabel>
        <ComboboxInput placeholder={picker.loading ? "Loading cards…" : "Type a card name, set or number"} />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>{picker.query.trim() ? "No matches" : "Start typing to search"}</ComboboxEmpty>
        <ComboboxList>
          {picker.suggesting ? (
            <ComboboxGroup>
              <ComboboxGroupLabel>{suggestionsLabel}</ComboboxGroupLabel>
              {picker.results.map((option) => (
                <CardOption key={option.value} option={option} />
              ))}
            </ComboboxGroup>
          ) : (
            picker.results.map((option) => <CardOption key={option.value} option={option} />)
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

/** A card in a dialog's list: row-tall art, the name over its printing (with any detail and note),
    and the row's controls. On a very narrow phone the controls drop below. */
export function CardRow({
  card,
  detail,
  note,
  noteShort,
  children,
}: {
  card: Card
  /** Quiet text after the printing, like "× 5". */
  detail?: string
  /** A badge; `noteShort` replaces its text on phones. */
  note?: string
  noteShort?: string
  /** The row's controls. */
  children?: ReactNode
}) {
  return (
    // The art is as tall as the row; the name and printing sit centred beside it. From sm up the controls
    // are a column of their own, centred on the right (the wrapper below becomes `contents` and the content
    // a two-column grid); on a phone they share the printing's line, so a card takes two lines.
    <Item variant="outline" size="sm" data-card-row="">
      <ItemMedia>
        {/* A little narrower on a phone, so the printing and the controls share a line. */}
        <CardThumb src={card.imageUrl} size={44} className="max-sm:h-auto max-sm:w-9" />
      </ItemMedia>
      <ItemContent className="self-center sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-4">
        <ItemTitle className="block max-w-full truncate sm:col-start-1" title={card.name}>
          {card.name}
        </ItemTitle>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:contents">
          <ItemDescription className="flex shrink-0 items-center gap-2 whitespace-nowrap sm:col-start-1">
            {cardMeta(card)}
            {detail && <span>{detail}</span>}
            {note && (
              <Badge variant="secondary">
                <span className="sm:hidden">{noteShort ?? note}</span>
                <span className="hidden sm:inline">{note}</span>
              </Badge>
            )}
          </ItemDescription>
          {children && <ItemActions className="ml-auto sm:col-start-2 sm:row-span-2 sm:row-start-1">{children}</ItemActions>}
        </div>
      </ItemContent>
    </Item>
  )
}

type LoanItem = { cardId: string; quantity: number; card: Card | null }

/** A loan's cards at a glance, for a table cell: one card as itself, several as a fanned hand with a
    count and their names on one line. Goes inside an Item (the button that opens the loan). */
export function LoanCards({ items }: { items: LoanItem[] }) {
  const [only] = items
  if (items.length === 1 && only.card)
    return (
      <>
        <ItemMedia>
          <CardThumb src={only.card.imageUrl} size={32} />
        </ItemMedia>
        <CardName card={only.card}>{only.quantity > 1 && <span>× {only.quantity}</span>}</CardName>
      </>
    )
  const copies = items.reduce((sum, item) => sum + item.quantity, 0)
  const names = items.map((item) => item.card?.name ?? "Unknown card").join(", ")
  return (
    <>
      <ItemMedia>
        <span data-slot="card-fan">
          {items.slice(0, 3).map((item) => item.card && <CardThumb key={item.cardId} src={item.card.imageUrl} size={32} />)}
        </span>
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="block max-w-full truncate">
          {items.length} cards · {copies} copies
        </ItemTitle>
        <ItemDescription className="block truncate">{names}</ItemDescription>
      </ItemContent>
    </>
  )
}
