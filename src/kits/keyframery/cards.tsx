"use client"

import { CheckIcon, ImagesIcon } from "lucide-react"
import Image, { type StaticImageData } from "next/image"
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react"
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
import body from "@/images/domains/body.svg"
import calm from "@/images/domains/calm.svg"
import chaos from "@/images/domains/chaos.svg"
import fury from "@/images/domains/fury.svg"
import mind from "@/images/domains/mind.svg"
import order from "@/images/domains/order.svg"
import { cn } from "@/kits/keyframery/lib/utils"
import { Badge } from "@/kits/keyframery/ui/badge"
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemMedia, ItemTitle } from "@/kits/keyframery/ui/item"

/** Card art is 744×1039, or 1039×744 for a battlefield, which lies on its side. */
const artHeight = (width: number, landscape = false) => Math.round(landscape ? (width * 744) / 1039 : (width * 1039) / 744)
/** Whether a card's art is landscape: battlefields are. */
export const DOMAIN_ICONS: Record<string, StaticImageData> = { Fury: fury, Calm: calm, Mind: mind, Body: body, Chaos: chaos, Order: order }

/** A colour's symbol, as the cards print it. */
export function DomainIcon({ domain, size = 16 }: { domain: string; size?: number }) {
  return <Image src={DOMAIN_ICONS[domain]} alt="" width={size} height={size} />
}

/** A card's colours, as their symbols. */
export function Domains({ domains }: { domains?: string[] }) {
  const coloured = domains?.filter((d) => d in DOMAIN_ICONS) ?? []
  return coloured.length ? (
    <span role="img" aria-label={coloured.join(" and ")} title={coloured.join(" and ")} className="flex gap-1">
      {coloured.map((d) => (
        <DomainIcon key={d} domain={d} size={18} />
      ))}
    </span>
  ) : null
}

export const isLandscape = (card: Pick<Card, "type">) => card.type === "Battlefield"

export function CardThumb({ src, size = 40, landscape, className }: { src: string; size?: number; landscape?: boolean; className?: string }) {
  // Alt is empty because the card's name always sits next to it. `className` only resizes it.
  return <Image src={src} alt="" width={size} height={artHeight(size, landscape)} className={cn("shrink-0 rounded-[3px]", className)} />
}

const PREVIEW = 216

/** Marks the element with data-bump="up" or "down" each time `count` rises or falls, so it plays the kit's bump once
    (globals.css): a card reacts to a copy going in or out, not just its number. */
function useBump<T extends HTMLElement>(count: number | undefined) {
  const ref = useRef<T>(null)
  const last = useRef(count)
  useEffect(() => {
    const before = last.current
    last.current = count
    const el = ref.current
    if (!el || count === undefined || before === undefined || count === before) return
    el.removeAttribute("data-bump")
    void el.offsetWidth // restarts the animation when clicks come faster than it runs
    el.setAttribute("data-bump", count > before ? "up" : "down")
  }, [count])
  return ref
}

/** A thumbnail that lifts the full printing beside it while the pointer rests on it or a finger holds it.
    `preview` is the lifted card's width (globals.css draws it at the same `--card-preview`); `className` only resizes the thumbnail. */
export function CardArt({
  src,
  size,
  preview = PREVIEW,
  landscape,
  className,
}: {
  src: string
  size: number
  preview?: number
  landscape?: boolean
  className?: string
}) {
  // Both images ask for the preview's width, so the thumbnail's download is the preview's too.
  const sizes = `${preview}px`
  const lifted = useRef<HTMLSpanElement>(null)
  // The preview opens in the browser's top layer, above every panel, dialog and scrolling list, whatever their stacking.
  const lift = (open: boolean) => lifted.current?.togglePopover?.(open)
  return (
    <span data-slot="card-art" data-landscape={landscape ? "" : undefined} onPointerEnter={() => lift(true)} onPointerLeave={() => lift(false)}>
      <Image src={src} alt="" width={size} height={artHeight(size, landscape)} sizes={sizes} className={className} />
      <span ref={lifted} data-slot="card-art-preview" popover="manual" aria-hidden>
        <Image src={src} alt="" width={preview} height={artHeight(preview, landscape)} sizes={sizes} />
      </span>
    </span>
  )
}

/** The bigger preview for the deck builder's tiles and stamps, whose art is already larger than a table's. */
const LARGE_PREVIEW = 320

/** A card as it sits in a list or table cell: art, then name over its printing. */
export function CardCell({ card, artSize = 32, children }: { card: Card; artSize?: number; children?: ReactNode }) {
  return (
    // From sm up, narrow tables scroll sideways rather than squeezing a card name into the next column;
    // phones show tables as lists, where the name gets the row's width and truncates.
    <Item className="sm:min-w-48">
      <ItemMedia>
        <CardArt src={card.imageUrl} size={artSize} />
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
  detail?: ReactNode
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

/** A card in a grid: its art on top (with the copies already in the deck in its corner, "3x"; clicking it
    can stand in for the main control), then one
    line each of name, detail and controls, so every tile in a grid is the same height. */
export function CardTile({
  card,
  count,
  detail,
  versions = 1,
  onArtClick,
  children,
}: {
  card: Card
  count?: number
  detail?: string
  /** How many printings the card has (alternate arts and the like); more than one shows in the art's bottom left corner. */
  versions?: number
  /** A pointer shortcut for the tile's main control, which keyboards and screen readers use instead. */
  onArtClick?: () => void
  children?: ReactNode
}) {
  const bump = useBump<HTMLDivElement>(count)
  return (
    <Item ref={bump} variant="outline" data-card-tile="" className="h-full">
      <ItemHeader data-tile-art="" data-clickable={onArtClick ? "" : undefined} onClick={onArtClick}>
        <CardArt src={card.imageUrl} size={180} preview={LARGE_PREVIEW} landscape={isLandscape(card)} className="h-auto w-full" />
        {count ? <Badge data-stamp-count="" data-count="">{count + "x"}</Badge> : null}
        {versions > 1 && (
          <span data-stamp-tags="">
            <Badge variant="secondary" title={`${versions} printings`}>
              <ImagesIcon aria-hidden="true" />
              {versions}
              <span className="sr-only"> printings</span>
            </Badge>
          </span>
        )}
      </ItemHeader>
      <ItemContent>
        <ItemTitle className="block max-w-full truncate" title={card.name}>
          {card.name}
        </ItemTitle>
        {/* A line even when empty, so tiles keep one height. */}
        <ItemDescription className="block truncate">{detail || " "}</ItemDescription>
      </ItemContent>
      {children && <ItemFooter>{children}</ItemFooter>}
    </Item>
  )
}

/** A short label on a card; `tone` names its colour in globals.css (data-status), `title` gives the whole. */
export type CardTag = { text: ReactNode; tone: string; title?: string }

const tagBadges = (tags: CardTag[]) =>
  tags.map((tag) => (
    <Badge key={tag.tone} data-status={tag.tone} title={tag.title}>
      {tag.text}
    </Badge>
  ))

/** A card as a small stamp of its art, its count and its tags laid over its bottom corners. The stamp is a button (give it
    an `aria-label` and `onClick`); `action`, a small control of its own, sits in its top corner beside it. */
export function CardStamp({
  card,
  count,
  tags = [],
  action,
  checked,
  ...props
}: {
  card: Card
  count?: number
  /** Stacked in the bottom left corner. */
  tags?: CardTag[]
  action?: ReactNode
  /** Picked while selecting several cards: a check in the top left corner. */
  checked?: boolean
} & ComponentProps<typeof Item>) {
  const bump = useBump<HTMLDivElement>(count)
  return (
    <div ref={bump} data-stamp-frame="">
      <Item render={<button type="button" />} data-card-stamp="" title={card.name} className="w-full min-w-0" {...props}>
        <CardArt src={card.imageUrl} size={112} preview={LARGE_PREVIEW} landscape={isLandscape(card)} className="h-auto w-full" />
        {checked && <CheckMark />}
        {count !== undefined && <Badge data-stamp-count="" data-count="">{count + "x"}</Badge>}
        {tags.length > 0 && <span data-stamp-tags="">{tagBadges(tags)}</span>}
      </Item>
      {action && <div data-stamp-action="">{action}</div>}
    </div>
  )
}

/** The check on a card picked while selecting several. */
function CheckMark() {
  return (
    <Badge data-card-check="" aria-hidden="true">
      <CheckIcon />
    </Badge>
  )
}

/** A card as a line in a list: its art the row's full height on the left, then its name over its count
    and tags, and the row's `action` on the right. Same `tags` as CardStamp. Given `onClick` (while selecting several
    cards), the whole line is a button, with `checked` marking it picked. `wide` (the deck viewer, which has the room):
    one row, everything centred on it, the name then the card's colours, its count and its tags. */
export function CardLine({
  card,
  count,
  tags = [],
  action,
  checked,
  wide,
  ...props
}: {
  card: Card
  count?: number
  tags?: CardTag[]
  action?: ReactNode
  checked?: boolean
  wide?: boolean
} & ComponentProps<typeof Item>) {
  const bump = useBump<HTMLDivElement>(count)
  const countText = count !== undefined && <span data-count="">{count + "x"}</span>
  return (
    <Item
      ref={bump}
      variant="outline"
      data-card-line=""
      data-wide={wide ? "" : undefined}
      render={props.onClick ? <button type="button" /> : undefined}
      {...props}
    >
      {checked && <CheckMark />}
      <ItemMedia>
        <CardArt src={card.imageUrl} size={wide ? 28 : 44} preview={LARGE_PREVIEW} landscape={isLandscape(card)} />
      </ItemMedia>
      {wide ? (
        <ItemContent className="flex-row items-center gap-3">
          <ItemTitle className="block min-w-0 flex-1 truncate" title={card.name}>
            {card.name}
          </ItemTitle>
          <Domains domains={card.domains} />
          {countText}
          {tags.length > 0 && <span className="flex items-center gap-1">{tagBadges(tags)}</span>}
        </ItemContent>
      ) : (
        <ItemContent>
          <ItemTitle className="block max-w-full truncate" title={card.name}>
            {card.name}
          </ItemTitle>
          <ItemDescription className="flex items-center gap-2">
            {countText}
            {tagBadges(tags)}
          </ItemDescription>
        </ItemContent>
      )}
      {action && <ItemActions>{action}</ItemActions>}
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
