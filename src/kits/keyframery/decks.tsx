"use client"

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClipboardPasteIcon,
  EyeIcon,
  ClockIcon,
  InfoIcon,
  LayoutGridIcon,
  ListIcon,
  MailIcon,
  PencilIcon,
  ListChecksIcon,
  MinusIcon,
  PlusIcon,
  ShapesIcon,
  ShareIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react"
import { LANDSCAPE, PORTRAIT, fitCards, fitLines, useMinWidth } from "@/core/fit"
import { formatDate } from "@/core/format"
import { cn } from "@/kits/keyframery/lib/utils"
import {
  BROWSE,
  CARD_TYPES,
  DOMAINS,
  STATUSES,
  ZONES,
  baseName,
  deckLines,
  copiesOf,
  deckIssues,
  deckTitle,
  moveCopies,
  resizeCopies,
  shiftCopy,
  printingLabel,
  statusCounts,
  useDeckDraft,
  useDeckExports,
  useMyDecks,
  type Browse,
  type Deck,
  type DeckDraft,
  type StatusCopies,
  type DeckStatus,
  type DeckZone,
  type DraftLine,
} from "@/core/decks"
import { labels } from "@/core/labels"
import { useSession } from "@/core/people"
import mark from "@/images/borrower_mark.png"
import { Badge } from "@/kits/keyframery/ui/badge"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/kits/keyframery/ui/dialog"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Input } from "@/kits/keyframery/ui/input"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/kits/keyframery/ui/item"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/kits/keyframery/ui/tabs"
import { Textarea } from "@/kits/keyframery/ui/textarea"
import { CardArt, CardLine, CardRow, CardStamp, CardThumb, CardTile, DomainIcon, Domains, isLandscape } from "./cards"
import { ChoiceSelect, Copies, EmptyNote, EmptyState, ErrorAlert, SearchInput, Tip } from "./fields"
import { PageHeader, SignIn } from "./shell"

const zoneLabel = (zone: DeckZone) => ZONES.find((z) => z.zone === zone)!.label.toLowerCase()

/** A sentence the builder wants read whole, politely: kit Alerts are always role="alert". */
function Note({ warn, title, children }: { warn?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <div role="status">
      <Item variant="muted" size="sm" data-note="" data-warn={warn ? "" : undefined}>
        <ItemMedia variant="icon">{warn ? <TriangleAlertIcon aria-hidden="true" /> : <InfoIcon aria-hidden="true" />}</ItemMedia>
        <ItemContent>
          {title && <ItemTitle>{title}</ItemTitle>}
          {/* Unclamped: the kit cuts descriptions at two lines. */}
          <ItemDescription className="line-clamp-none">{children}</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  )
}

function Filters({ draft }: { draft: DeckDraft }) {
  const { filters, setFilters } = draft
  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
        <Field>
          <FieldLabel>{labels.searchDeckCards}</FieldLabel>
          <SearchInput value={filters.query} onValueChange={(query) => setFilters({ query })} placeholder="Card name" />
        </Field>
        {draft.browse === "cards" && (
          <ChoiceSelect
            label={labels.filterType}
            options={[{ value: "", label: "Any type" }, ...CARD_TYPES.map((t) => ({ value: t, label: t }))]}
            value={filters.type}
            onValueChange={(type) => setFilters({ type })}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {draft.domainChoices.map((d) => {
          const on = filters.domains.includes(d)
          return (
            <Button
              key={d}
              size="sm"
              variant={on ? "primary" : "default"}
              aria-pressed={on}
              aria-label={labels.filterColour(d)}
              onClick={() => setFilters({ domains: on ? filters.domains.filter((x) => x !== d) : [...filters.domains, d] })}
            >
              <DomainIcon domain={d} />
              {d}
            </Button>
          )
        })}
        <Button size="sm" variant={filters.owned ? "primary" : "default"} aria-pressed={filters.owned} onClick={() => setFilters({ owned: !filters.owned })}>
          {labels.ownedOnly}
        </Button>
      </div>
    </div>
  )
}

function Results({ draft, browse }: { draft: DeckDraft; browse: Browse }) {
  const shown = draft.results
  // The cards step adds to the main deck or the sideboard; every other step has one place to put a card.
  const targets: DeckZone[] = browse === "cards" ? ["main", "side"] : [browse === "legend" ? "legend" : browse === "champion" ? "champion" : browse]
  // Clicking a card's art does its first button: in the cards step that's the main deck, once the legend and champion are in.
  const artAdds = browse !== "cards" || (draft.legend !== undefined && draft.lines.some((l) => l.zone === "champion"))
  if (browse === "champion" && !draft.legend) return <EmptyNote>Pick a legend first: its champion leads the deck.</EmptyNote>
  if (draft.loading) return <EmptyNote>Loading cards…</EmptyNote>
  if (shown.length === 0) return <EmptyNote>Nothing matches those filters.</EmptyNote>
  return (
    <>
      {/* relative -m-1 p-1: room for the tile outlines inside the scroll box. */}
      <ul
        aria-label={labels.browseDeckCards}
        className="relative -m-1 grid min-h-0 grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] content-start gap-2 overflow-y-auto overscroll-contain p-1 lg:flex-1"
      >
        {shown.map((card) => {
          const held = draft.holding(card)
          const copies = draft.inDeck(card)
          return (
            <li key={card._id}>
              <CardTile
                card={card}
                onArtClick={artAdds && draft.room(card, targets[0]) > 0 ? () => draft.add(card, targets[0]) : undefined}
                count={copies}
                versions={draft.versions(card).length}
                detail={held.free + held.borrowed + held.lent === 0 ? "" : `${held.free + held.borrowed} free`}
              >
                {targets.map((zone) => (
                  <Button
                    key={zone}
                    size="sm"
                    className="flex-1"
                    disabled={draft.room(card, zone) === 0}
                    aria-label={labels.addToDeck(card.name, zoneLabel(zone))}
                    onClick={() => draft.add(card, zone)}
                  >
                    {zone === "side" ? "Side" : zone === "main" ? "Main" : browse === "legend" || browse === "champion" ? "Choose" : "Add"}
                  </Button>
                ))}
              </CardTile>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** Pasting a list in, from a button in the builder's header. A clean import closes the dialog; one that left cards out
    stays open to say which; one that failed says why and changes nothing. Then, if the collection leaves any copies
    out of hand, the status check follows. */
function ImportDialog({ draft }: { draft: DeckDraft }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [message, setMessage] = useState<{ text: string; imported: boolean } | null>(null)
  // The status check waits for this dialog to close: one dialog at a time.
  const [review, setReview] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  function close() {
    setOpen(false)
    setMessage(null)
    setReviewing(review)
    setReview(false)
  }
  return (
    <>
      <Dialog open={open} onOpenChange={(next: boolean) => (next ? setOpen(true) : close())}>
        <DialogTrigger render={<Button />}>
          <ClipboardPasteIcon aria-hidden="true" />
          {labels.importDeck}
        </DialogTrigger>
        <DialogBackdrop />
        <DialogContent className="flex flex-col [--dialog-width:36rem]">
          <DialogClose variant="icon" />
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{labels.importDeck}</DialogTitle>
              <DialogDescription>
                Paste a list in the sectioned text format (Legend:, Champion:, MainDeck:, Battlefields:, Rune Pool:, Sideboard:) or
                TopDeck’s ~~Heading~~ one, or a deck code from Piltover Archive and other deck sites. It replaces the cards so far.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel>{labels.deckList}</FieldLabel>
              <Textarea value={text} onValueChange={setText} placeholder={"Legend:\n1 Riven, The Exile\n\nMainDeck:\n3 …"} />
            </Field>
            {message && <Note warn>{message.text}</Note>}
            <DialogFooter>
              {/* Once a list is in (some cards left out), closing is finishing, not cancelling. */}
              <DialogClose render={<Button />}>{message?.imported ? "Done" : "Cancel"}</DialogClose>
              <Button
                variant="primary"
                disabled={!text.trim() || draft.loading}
                onClick={() => {
                  const { imported, problem, review: needsReview } = draft.importText(text)
                  if (!imported) return setMessage({ text: problem, imported })
                  setReview(needsReview)
                  // Cards left out: the list is in, but say which before closing.
                  if (problem) return setMessage({ text: `Imported. ${problem}.`, imported })
                  setOpen(false)
                  setMessage(null)
                  setText("")
                  setReviewing(needsReview)
                }}
              >
                {labels.importConfirm}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {reviewing && (
        <ReviewStatuses
          draft={draft}
          title={labels.reviewImportTitle}
          intro="Statuses come from your collection: copies you have free are available, then any you've borrowed, then copies out on loan are lent, and any more are not in collection. Change any that aren't right, like cards in the post."
          confirm={labels.reviewDone}
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  )
}

function Browser({ draft }: { draft: DeckDraft }) {
  return (
    <Tabs value={draft.browse} onValueChange={(v) => draft.setBrowse(v as Browse)} className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Five steps outgrow a phone: the list scrolls sideways rather than wrapping. */}
      <div className="-m-1 shrink-0 overflow-x-auto p-1">
        <TabsList aria-label={labels.browseDeckCards}>
          {BROWSE.map((b) => (
            <TabsTab key={b.value} value={b.value}>
              {b.label}
            </TabsTab>
          ))}
        </TabsList>
      </div>
      {BROWSE.map((b) => (
        <TabsPanel key={b.value} value={b.value} className="flex min-h-0 flex-1 flex-col gap-3">
          <Filters draft={draft} />
          <Results draft={draft} browse={b.value} />
        </TabsPanel>
      ))}
    </Tabs>
  )
}

/** The deck as art stamps (a click takes a copy out) or as a two-column list of lines. */
type DeckView = "grid" | "list"

/** A status on a card's small tag, as an icon; the whole shows on hover and to screen readers. */
const STATUS_ICONS: Record<DeckStatus, LucideIcon> = { available: CheckIcon, borrowed: ArrowDownLeftIcon, posted: MailIcon, awaiting: ClockIcon, lent: ArrowUpRightIcon, missing: XIcon }

/** A status's icon on a disc of its colour, beside its name in the filters and the card dialog. */
function StatusIcon({ status }: { status: DeckStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <span data-status-swatch="" data-status={status} aria-hidden="true">
      <Icon />
    </span>
  )
}

const NO_COPIES: StatusCopies = { available: 0, borrowed: 0, posted: 0, awaiting: 0, lent: 0, missing: 0 }

/** A card in the deck: a stamp of its art that takes a copy out when clicked, and a corner button for its
    copies in each status and its removal. `lines` are the card's lines in one zone, one per status. While `select`
    is given (picking several cards), a click picks the card or puts it back instead, and the corner button goes.
    `viewOnly` (the deck viewer): a click opens the dialog, which only moves copies between statuses and saves on Done. */
function DeckCard({
  draft,
  lines,
  view,
  select,
  viewOnly,
}: {
  draft: DeckDraft
  lines: DraftLine[]
  view: DeckView
  select?: { picked: boolean; toggle: () => void }
  viewOnly?: boolean
}) {
  const [{ card, zone: deckZone }] = lines
  const versions = draft.versions(card)
  const zone = zoneLabel(deckZone)
  const counted = deckZone === "main" || deckZone === "side" || deckZone === "rune"
  // A gold ring (globals.css) marks the chosen champion, which the viewer shows first in the main deck.
  const champion = deckZone === "champion" ? "" : undefined
  const quantity = lines.reduce((sum, l) => sum + l.quantity, 0)
  const copies = (status: DeckStatus) => lines.find((l) => l.status === status)?.quantity ?? 0
  const held = STATUSES.filter((s) => copies(s.status) > 0)
  // One tag per status; a card split across statuses gives each its copies ("2 ✓" over "1 🕒").
  const tags = held.map(({ status, label }) => {
    const Icon = STATUS_ICONS[status]
    const title = held.length > 1 ? `${copies(status)} ${label.toLowerCase()}` : label
    const text = (
      <>
        {held.length > 1 && <span data-tag-count="" aria-hidden="true">{copies(status)}</span>}
        <Icon aria-hidden="true" />
        <span className="sr-only">{title}</span>
      </>
    )
    return { text, tone: status, title }
  })
  const last = lines.find((l) => l.status === held[held.length - 1].status)!
  // The dialog edits its own copy of the card (printing and copies per status); Done writes it to the deck, closing any
  // other way leaves the deck as it was. The deck list doesn't change under an open dialog, and copies move freely.
  const saved = () => ({ printing: card, copies: copiesOf(lines) })
  const [edit, setEdit] = useState(saved)
  const [open, setOpen] = useState(false)
  const openWith = (next: boolean) => {
    if (next) setEdit(saved())
    setOpen(next)
  }
  const max = draft.maxCopies(card, deckZone)
  const editTotal = Object.values(edit.copies).reduce((sum, n) => sum + n, 0)
  const single = STATUSES.find((s) => edit.copies[s.status] > 0)?.status ?? "available"
  const menu = (
    <DialogTrigger render={<Button size="icon-sm" aria-label={labels.deckCard(card.name, zone)} />}>
      <PencilIcon aria-hidden="true" />
    </DialogTrigger>
  )
  const picking = select && {
    checked: select.picked,
    "aria-pressed": select.picked,
    "aria-label": labels.pickDeckCard(card.name, zone),
    onClick: select.toggle,
  }
  return (
    <Dialog open={open} onOpenChange={openWith}>
      {view === "grid" ? (
        // A click on the card takes one copy out (of its last status); its corner button opens the copies and statuses.
        // Viewing, the card can't lose copies, so a click opens the statuses instead.
        <CardStamp
          card={card}
          count={counted ? quantity : undefined}
          tags={tags}
          data-champion={champion}
          aria-description={tags.map((t) => t.title).join(", ")}
          {...(picking ||
            (viewOnly
              ? { "aria-label": labels.deckCard(card.name, zone), onClick: () => openWith(true) }
              : { "aria-label": labels.removeOneFromDeck(card.name, zone), onClick: () => draft.removeOne(last), action: menu }))}
        />
      ) : (
        <CardLine
          card={card}
          count={counted ? quantity : undefined}
          tags={tags}
          wide={viewOnly}
          data-champion={champion}
          {...(picking || { action: menu })}
        />
      )}
      <DialogBackdrop />
      {/* Building: about a third of the window, so the card reads at a size worth inspecting beside the status steppers.
          Viewing: the card at a set width, the status pills stacked beside it as tall as it is, the dialog no wider. */}
      <DialogContent className={viewOnly ? "flex flex-col [--dialog-width:26rem]" : "flex flex-col [--dialog-width:max(36rem,36vw)]"}>
        <DialogClose variant="icon" />
        <div className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{edit.printing.name}</DialogTitle>
            <DialogDescription>
              {!counted ? `In the ${zone}` : editTotal ? `${editTotal} in the ${zone}` : `None left: Done takes it out of the ${zone}`}
            </DialogDescription>
          </DialogHeader>
          {/* The art takes what the controls leave; the controls keep their own width, so nothing is cut off. */}
          <div
            className={
              viewOnly
                ? "grid grid-cols-[minmax(0,11rem)_auto] items-stretch justify-center gap-6"
                : "grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]"
            }
          >
            <CardThumb src={edit.printing.imageUrl} size={360} landscape={isLandscape(card)} className="h-auto w-full" />
            <div className={cn("flex min-w-0 flex-col gap-3", viewOnly && "justify-center")}>
              {/* Every copy here is one printing; picking another swaps the art beside it. */}
              {!viewOnly && versions.length > 1 && (
                <ChoiceSelect
                  label={labels.cardPrinting}
                  options={versions.map((v) => ({ value: v._id, label: printingLabel(v) }))}
                  value={edit.printing._id}
                  onValueChange={(id) => setEdit({ ...edit, printing: versions.find((v) => v._id === id)! })}
                />
              )}
              {counted && viewOnly ? (
                // Viewing keeps the card's number of copies: the review's chips, which only move copies between statuses.
                <div role="group" aria-label={labels.cardStatuses(card.name)} className="flex flex-1 flex-col items-start justify-between gap-2">
                  <StatusChips name={card.name} copies={edit.copies} onShift={(status, by) => setEdit({ ...edit, copies: shiftCopy(edit.copies, status, by) })} />
                </div>
              ) : counted ? (
                // Copies in each status, one row each: icon, name, stepper, the steppers lined up in one column. Capped at
                // 3 of a name across champion, main deck and sideboard (runes at the 12 of the rune deck); at the cap,
                // raising one status moves copies over from the others.
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3">
                  {STATUSES.map(({ status, label }) => (
                    <Fragment key={status}>
                      <StatusIcon status={status} />
                      <span className="truncate pr-2">{label}</span>
                      <Copies
                        label={labels.statusCopies(label, card.name, zone)}
                        hideLabel
                        min={0}
                        max={max}
                        value={edit.copies[status]}
                        onValueChange={(n) => setEdit({ ...edit, copies: moveCopies(edit.copies, status, n, max) })}
                      />
                    </Fragment>
                  ))}
                </div>
              ) : (
                <ChoiceSelect
                  label={labels.cardStatus}
                  options={STATUSES.map((s) => ({ value: s.status, label: s.label, icon: <StatusIcon status={s.status} /> }))}
                  value={single}
                  onValueChange={(next) => setEdit({ ...edit, copies: { ...NO_COPIES, [next]: 1 } })}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            {/* Away from Done, so it isn't hit by mistake; the button's name says the whole. */}
            {!viewOnly && (
              <DialogClose
                render={
                  <Button
                    variant="destructive"
                    className="mr-auto"
                    aria-label={labels.removeFromDeck(card.name, zone)}
                    onClick={() => draft.remove(card, deckZone)}
                  />
                }
              >
                <Trash2Icon aria-hidden="true" />
                Remove
              </DialogClose>
            )}
            <DialogClose
              render={
                <Button
                  variant="primary"
                  onClick={() =>
                    viewOnly
                      ? STATUSES.some(({ status }) => edit.copies[status] !== copies(status)) &&
                        void draft.saveCards([{ card, zone: deckZone, copies: edit.copies }])
                      : draft.setCard(card, deckZone, edit.printing, edit.copies)
                  }
                />
              }
            >
              Done
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The deck's sections. The legend, chosen champion and runes (one or two cards between them) share the first
    row, the battlefields the next, so the deck takes as few rows as it can. */
const SECTIONS: { label: string; zones: DeckZone[] }[] = [
  { label: "Legend, chosen champion and runes", zones: ["legend", "champion", "rune"] },
  { label: "Battlefields", zones: ["battlefield"] },
  { label: "Main deck", zones: ["main"] },
  { label: "Sideboard", zones: ["side"] },
]

/** The main deck's and sideboard's subsections when grouped by type, in the order the game lists them. */
const TYPE_GROUPS: { label: string; match: (type?: string) => boolean }[] = [
  { label: "Units", match: (type) => type === "Unit" },
  { label: "Spells", match: (type) => type === "Spell" },
  { label: "Gear", match: (type) => type === "Gear" },
  // A card synced before the catalogue knew types.
  { label: "Other", match: (type) => !(CARD_TYPES as readonly (string | undefined)[]).includes(type) },
]

/** A heading in the deck viewer, its count (if any) quieter beside it. Its look, and the fixed line heights FitDeck
    counts on, are in globals.css. `sub` for a type's subsection within a section. */
function DeckLabel({ label, count, sub }: { label: string; count?: string | number; sub?: boolean }) {
  const Heading = sub ? "h4" : "h3"
  return (
    <Heading data-deck-label={sub ? "sub" : ""}>
      {label}
      {count !== undefined && <span data-deck-count="">{count}</span>}
    </Heading>
  )
}

/** A pill per status with a card's copies in it: its icon and count, then − and +. + (or a click on the count) moves a
    copy into the status from the others, − moves one back to not in collection, so the card keeps its number of copies
    (shiftCopy). The caller gives the group around them. */
function StatusChips({ name, copies, onShift }: { name: string; copies: StatusCopies; onShift: (status: DeckStatus, by: 1 | -1) => void }) {
  const total = Object.values(copies).reduce((sum, n) => sum + n, 0)
  return STATUSES.map(({ status, label }) => {
    const n = copies[status]
    const held = n > 0 ? "" : undefined
    const step = (by: 1 | -1, tip: string, aria: string, off: boolean, Icon: LucideIcon, part: "mid" | "end") => (
      <Tip label={tip}>
        <Button
          size="icon-sm"
          data-status-chip={part}
          data-status={status}
          data-held={held}
          // Off, not disabled: it stays reachable for its tooltip, and when off a press does nothing.
          aria-disabled={off}
          aria-label={aria}
          onClick={() => onShift(status, by)}
        >
          <Icon aria-hidden="true" />
        </Button>
      </Tip>
    )
    return (
      <span key={status} className="flex">
        <Tip label={`${label}: ${n}. Click to add one`}>
          <Button
            size="sm"
            data-status-chip="start"
            data-status={status}
            data-held={held}
            aria-label={labels.oneMoreAs(name, label, n)}
            onClick={() => onShift(status, 1)}
          >
            <StatusIcon status={status} />
            <span data-chip-count="">{n}</span>
          </Button>
        </Tip>
        {/* Not in collection is where copies go back to, so it has no − of its own. */}
        {status !== "missing" && step(-1, `One fewer ${label.toLowerCase()}`, labels.oneFewerAs(name, label), n === 0, MinusIcon, "mid")}
        {step(1, `One more ${label.toLowerCase()}`, labels.plusOneAs(name, label), n === total, PlusIcon, "end")}
      </span>
    )
  })
}

/** Looks over the cards that need it (draft.toReview: a copy that isn't in hand, or more copies than the collection
    has), after an import or before a save. A row a card: its art and name, what the member's collection holds, and a
    chip per status with its copies. Clicking a chip moves a copy into it, its − moves one back to not in collection, so
    the card always keeps its number of copies. `onClose` gets the deck as confirmed, or nothing when cancelled. */
function ReviewStatuses({
  draft,
  title,
  intro,
  confirm,
  onClose,
}: {
  draft: DeckDraft
  title: string
  intro: string
  confirm: string
  onClose: (deck?: DraftLine[]) => void
}) {
  // The cards as they were on opening: editing a status mustn't drop a row that no longer needs a look.
  const [groups] = useState(draft.toReview)
  const [edits, setEdits] = useState(() => groups.map(copiesOf))
  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogBackdrop />
      <DialogContent className="flex flex-col [--dialog-width:60rem]">
        <DialogClose variant="icon" />
        <div className="flex min-h-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{intro}</DialogDescription>
          </DialogHeader>
          <ul aria-label={labels.cardsToReview} className="-m-1 flex max-h-[55vh] flex-col gap-2 overflow-y-auto overscroll-contain p-1">
            {groups.map((lines, i) => {
              const [{ card, zone }] = lines
              const held = draft.holding(card)
              const shift = (status: DeckStatus, by: 1 | -1) => setEdits(edits.map((copies, j) => (j === i ? shiftCopy(copies, status, by) : copies)))
              return (
                <li key={cardKeyOf(lines[0])}>
                  {/* A line like the deck's list view: the art the row's full height, flush left. */}
                  <Item variant="outline" data-card-line="">
                    <ItemMedia>
                      <CardArt src={card.imageUrl} size={44} landscape={isLandscape(card)} />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="block max-w-full truncate" title={card.name}>
                        {card.name}
                      </ItemTitle>
                      <ItemDescription className="truncate">
                        {ZONES.find((z) => z.zone === zone)?.label} · yours: {held.free} free,{" "}
                        {held.borrowed ? `${held.borrowed} borrowed, ` : ""}
                        {held.lent} lent
                      </ItemDescription>
                    </ItemContent>
                    {/* One row of icon chips, each with its copies; the name is a quick tooltip away. */}
                    <ItemActions role="group" aria-label={labels.cardStatuses(card.name)} className="flex-nowrap gap-1.5">
                      <StatusChips name={card.name} copies={edits[i]} onShift={shift} />
                    </ItemActions>
                  </Item>
                </li>
              )
            })}
          </ul>
          <DialogFooter>
            <DialogClose render={<Button />}>Cancel</DialogClose>
            <Button
              variant="primary"
              onClick={() => onClose(draft.setCards(groups.map((lines, i) => ({ card: lines[0].card, zone: lines[0].zone, copies: edits[i] }))))}
            >
              {confirm}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A card in a zone, whatever its printing or statuses: how the deck shows it once and how picking finds it. */
const cardKeyOf = (line: DraftLine) => line.zone + baseName(line.card.name)

/** Edits the picked cards at once: each one's copies in the deck (none takes it out) and, if picked, one status for
    every copy. Nothing changes until Save; it opens fresh each time. `groups` are the picked cards' lines.
    `viewOnly` (the deck viewer): only the status, and Save saves the deck. */
function EditPicked({
  draft,
  groups,
  onClose,
  viewOnly,
}: {
  draft: DeckDraft
  groups: DraftLine[][]
  onClose: (saved: boolean) => void
  viewOnly?: boolean
}) {
  const [counts, setCounts] = useState(() => groups.map((lines) => lines.reduce((sum, l) => sum + l.quantity, 0)))
  const [status, setStatus] = useState<DeckStatus>()
  const leaving = counts.filter((n) => n === 0).length
  const cards = groups.length === 1 ? "1 card" : `${groups.length} cards`
  function save() {
    const changes = groups.map((lines, i) => ({ card: lines[0].card, zone: lines[0].zone, copies: resizeCopies(copiesOf(lines), counts[i], status) }))
    if (viewOnly) void draft.saveCards(changes)
    else draft.setCards(changes)
    onClose(true)
  }
  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose(false)}>
      <DialogBackdrop />
      {/* 46rem: wide enough for all six status keys on one line (they still wrap on a phone). */}
      <DialogContent className="flex flex-col [--dialog-width:max(46rem,40vw)]">
        <DialogClose variant="icon" />
        <div className="flex min-h-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{viewOnly ? labels.setPickedStatusTitle(cards) : labels.editPickedTitle(cards)}</DialogTitle>
            <DialogDescription>
              {viewOnly ? "Pick one status for all their copies, like Available once they've arrived." : "Set how many of each stay in the deck, and one status for all their copies."}
            </DialogDescription>
          </DialogHeader>
          {/* One column that scrolls, so a long pick stays inside the window. */}
          <ul aria-label={labels.pickedCards} className="-m-1 flex max-h-[45vh] flex-col gap-2 overflow-y-auto overscroll-contain p-1">
            {groups.map((lines, i) => {
              const [{ card, zone }] = lines
              const counted = zone === "main" || zone === "side" || zone === "rune"
              return (
                <li key={cardKeyOf(lines[0])}>
                  <CardRow card={card} detail={viewOnly ? `${counts[i]} in ${zoneLabel(zone)}` : zoneLabel(zone)}>
                    {!viewOnly && (
                      <Copies
                        label={labels.deckCopies(card.name, zoneLabel(zone))}
                        hideLabel
                        min={0}
                        max={counted ? draft.maxCopies(card, zone) : 1}
                        value={counts[i]}
                        onValueChange={(n) => setCounts(counts.map((c, j) => (j === i ? n : c)))}
                      />
                    )}
                  </CardRow>
                </li>
              )
            })}
          </ul>
          <div role="group" aria-label={labels.statusForAll} className="flex flex-col gap-2">
            <span>{labels.statusForAll}</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(({ status: s, label }) => (
                <Button
                  key={s}
                  size="sm"
                  variant={status === s ? "primary" : "default"}
                  aria-pressed={status === s}
                  // A second click goes back to keeping each card's own statuses.
                  onClick={() => setStatus(status === s ? undefined : s)}
                >
                  <StatusIcon status={s} />
                  {label}
                </Button>
              ))}
            </div>
          </div>
          {!viewOnly && (
            <Note warn>
              {`This updates ${cards} in one go.` + (leaving ? ` ${leaving === 1 ? "1 card" : `${leaving} cards`} at 0 leave the deck.` : "")}
            </Note>
          )}
          <DialogFooter>
            <DialogClose render={<Button />}>Cancel</DialogClose>
            {/* Viewing, a status is the only change there is to save. */}
            <Button variant="primary" disabled={viewOnly && !status} onClick={save}>
              <CheckIcon aria-hidden="true" />
              {labels.savePicked}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The deck and its filters. `viewOnly` (the deck viewer) leaves out adding and removing: cards only change status,
    and each change saves the deck. */
function DeckPane({ draft, viewOnly }: { draft: DeckDraft; viewOnly?: boolean }) {
  const { problems } = draft.issues
  // Narrows the cards shown to some statuses (none picked shows every card); the counts stay the whole deck's.
  const [statuses, setStatuses] = useState<DeckStatus[]>([])
  const [view, setView] = useState<DeckView>("grid")
  // Narrows the cards shown by name and colour too: the legend's colours once there is one.
  const [query, setQuery] = useState("")
  const [domains, setDomains] = useState<string[]>([])
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const domainChoices = draft.legend ? DOMAINS.filter((d) => draft.legend?.domains?.includes(d)) : DOMAINS
  const [byType, setByType] = useState(false)
  // Picking several cards to edit or delete at once. Cards are picked by their key, so a pick outlives filtering.
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const toggleSelecting = (on: boolean) => {
    setSelecting(on)
    setPicked([])
  }
  const everyCard = Map.groupBy(draft.lines, cardKeyOf)
  const pickedGroups = picked.flatMap((key) => (everyCard.has(key) ? [everyCard.get(key)!] : []))
  // `tracks`: the viewer's fitted rows and columns (FitDeck), in place of the usual grid.
  const list = (groups: DraftLine[][], label: string, tracks?: React.CSSProperties) => (
    <ul
      key={label}
      aria-label={label}
      style={tracks}
      className={
        tracks
          ? "grid shrink-0 grid-flow-col gap-2"
          : view === "list"
            ? // The viewer's one-row lines need a phone's whole width.
              viewOnly
              ? "grid gap-2 sm:grid-cols-2"
              : "grid grid-cols-2 gap-2"
            : "grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2"
      }
    >
      {groups.map((group) => {
        const key = cardKeyOf(group[0])
        const on = picked.includes(key)
        return (
          <li key={key}>
            <DeckCard
              draft={draft}
              lines={group}
              view={view}
              viewOnly={viewOnly}
              select={selecting ? { picked: on, toggle: () => setPicked(on ? picked.filter((k) => k !== key) : [...picked, key]) } : undefined}
            />
          </li>
        )
      })}
    </ul>
  )
  const linesIn = (zones: DeckZone[]) =>
    draft.lines.filter((l) => zones.includes(l.zone)).sort((a, b) => zones.indexOf(a.zone) - zones.indexOf(b.zone))
  // A card's lines in one zone (one per status) show as one card; the status filters keep it when any copy matches.
  const shownIn = (zones: DeckZone[]) =>
    [...Map.groupBy(linesIn(zones), cardKeyOf).values()].filter(
      (group) =>
        (!statuses.length || group.some((l) => statuses.includes(l.status))) &&
        words.every((w) => group[0].card.name.toLowerCase().includes(w)) &&
        (!domains.length || domains.some((d) => group[0].card.domains?.includes(d)))
    )
  // The main deck's and sideboard's copies over what they hold, "39/40"; other zones go uncounted in the viewer.
  const countFor = (zones: DeckZone[]) =>
    zones.includes("main") || zones.includes("side")
      ? `${linesIn(zones).reduce((sum, l) => sum + l.quantity, 0)}/${ZONES.filter((z) => zones.includes(z.zone)).reduce((sum, z) => sum + z.size, 0)}`
      : undefined
  const section = ({ label, zones }: (typeof SECTIONS)[number]) => {
    const lines = linesIn(zones)
    const shown = shownIn(zones)
    return (
      <section key={label} aria-label={label} className="flex flex-col gap-2">
        {/* Each zone's own count, so a shared row still says what's missing where. The viewer has a heading instead,
            counted for the main deck and sideboard; the deck's problems note names anything else missing. */}
        {viewOnly ? (
          <DeckLabel label={label} count={countFor(zones)} />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {ZONES.filter((z) => zones.includes(z.zone)).map(({ zone, label: name, size }) => {
              const count = lines.filter((l) => l.zone === zone).reduce((sum, l) => sum + l.quantity, 0)
              return (
                <Badge key={zone} variant={count === size ? "default" : count > size ? "destructive" : "outline"}>
                  {name} {count} / {zone === "side" ? `up to ${size}` : size}
                </Badge>
              )
            })}
          </div>
        )}
        {byType && (zones.includes("main") || zones.includes("side"))
          ? // Grouped by type: units, spells and gear each get a subsection with their copies counted.
            TYPE_GROUPS.map(({ label: type, match }) => {
              const ofType = shown.filter((group) => match(group[0].card.type))
              if (ofType.length === 0) return null
              const copies = ofType.flat().reduce((sum, l) => sum + l.quantity, 0)
              return (
                <div key={type} className="flex flex-col gap-1.5">
                  {viewOnly ? (
                    <DeckLabel label={type} count={copies} sub />
                  ) : (
                    <div>
                      <Badge variant="secondary">
                        {type} {copies}
                      </Badge>
                    </div>
                  )}
                  {list(ofType, `${label}: ${type}`)}
                </div>
              )
            })
          : shown.length > 0 && list(shown, label)}
      </section>
    )
  }
  // The viewer on a wide window shows the whole deck at once (FitDeck), as cards or lines. Grouping by type splits the main
  // deck and sideboard into units, spells and gear, side by side.
  const fitted = useMinWidth(1024) && viewOnly
  const subsOf = (groups: DraftLine[][]) =>
    byType
      ? TYPE_GROUPS.map(({ label, match }) => ({ label, groups: groups.filter((g) => match(g[0].card.type)) })).filter((s) => s.groups.length > 0)
      : [{ label: undefined, groups }]
  const fitLead = { legend: shownIn(["legend"]), runes: shownIn(["rune"]), battlefields: shownIn(["battlefield"]) }
  const fitSections = [
    // The chosen champion leads the main deck (and its units), ringed in gold.
    { label: "Main deck", count: countFor(["champion", "main"]), subs: subsOf([...shownIn(["champion"]), ...shownIn(["main"])]) },
    { label: "Sideboard", count: countFor(["side"]), subs: subsOf(shownIn(["side"])) },
  ].filter((s) => s.subs.some((sub) => sub.groups.length > 0))
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* The viewer puts the search and the filters on one line on a wide window, leaving the cards more height. */}
      <div className={viewOnly ? "flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center" : "contents"}>
      {/* Viewing on a wide window, the search is a set width so the colour, view and Select controls sit beside it on
          the left, and the status filters go to the right. */}
      <div className={cn("flex shrink-0 items-center gap-1.5", viewOnly && "min-w-0")}>
        <Field className={cn("min-w-0 flex-1", viewOnly && "lg:w-72 lg:flex-none")}>
          <FieldLabel className="sr-only">{labels.searchDeck}</FieldLabel>
          <SearchInput value={query} onValueChange={setQuery} placeholder={labels.searchDeck} />
        </Field>
        {domainChoices.map((d) => {
          const on = domains.includes(d)
          return (
            <Button
              key={d}
              size="icon-lg"
              variant={on ? "primary" : "default"}
              aria-pressed={on}
              aria-label={labels.filterDeckColour(d)}
              title={d}
              onClick={() => setDomains(on ? domains.filter((x) => x !== d) : [...domains, d])}
            >
              <DomainIcon domain={d} />
            </Button>
          )
        })}
      </div>
      <div className={cn("flex shrink-0 flex-wrap gap-1.5", viewOnly && "lg:flex-1 lg:items-center")}>
        <div role="group" aria-label={labels.deckView} className="flex gap-1">
          {(["grid", "list"] as const).map((v) => (
            <Button
              key={v}
              size="icon-sm"
              variant={view === v ? "primary" : "default"}
              aria-pressed={view === v}
              aria-label={v === "grid" ? labels.deckAsGrid : labels.deckAsList}
              onClick={() => setView(v)}
            >
              {v === "grid" ? <LayoutGridIcon aria-hidden="true" /> : <ListIcon aria-hidden="true" />}
            </Button>
          ))}
        </div>
        <Button
          size="icon-sm"
          className="ml-1"
          variant={byType ? "primary" : "default"}
          aria-pressed={byType}
          aria-label={labels.groupByType}
          title={labels.groupByType}
          onClick={() => setByType(!byType)}
        >
          <ShapesIcon aria-hidden="true" />
        </Button>
        {/* Picking happens in this line, beside Select (a second click ends it and lets the picks go), so the deck below
            keeps its height. */}
        <div className="mr-auto flex items-center gap-1.5">
          <Button size="sm" variant={selecting ? "primary" : "default"} aria-pressed={selecting} onClick={() => toggleSelecting(!selecting)}>
            <ListChecksIcon aria-hidden="true" />
            {labels.selectCards}
          </Button>
          {selecting && (
            <div role="group" aria-label={labels.selection} className="flex items-center gap-1.5">
              <Badge variant="secondary">{labels.pickedCount(pickedGroups.length)}</Badge>
              <Button size="sm" disabled={pickedGroups.length === 0} onClick={() => setEditing(true)}>
                <PencilIcon aria-hidden="true" />
                {viewOnly ? labels.setPickedStatus : labels.editPicked}
              </Button>
              {!viewOnly && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pickedGroups.length === 0}
                  onClick={() => {
                    for (const [line] of pickedGroups) draft.remove(line.card, line.zone)
                    setPicked([])
                  }}
                >
                  <Trash2Icon aria-hidden="true" />
                  {labels.deletePicked}
                </Button>
              )}
            </div>
          )}
        </div>
        {/* Five statuses don't fit by name beside the view toggle, so each filter is its icon and the deck's copies in that
            status; the name shows on hover and to screen readers. */}
        {STATUSES.map(({ status, label }) => {
          const on = statuses.includes(status)
          const copies = draft.lines.filter((l) => l.status === status).reduce((sum, l) => sum + l.quantity, 0)
          return (
            <Button
              key={status}
              size="sm"
              variant={on ? "primary" : "default"}
              aria-pressed={on}
              aria-label={labels.filterStatus(label)}
              title={`${label}: ${copies}`}
              onClick={() => setStatuses(on ? statuses.filter((s) => s !== status) : [...statuses, status])}
            >
              <StatusIcon status={status} />
              {copies}
            </Button>
          )
        })}
      </div>
      </div>
      {editing && (
        <EditPicked
          draft={draft}
          groups={pickedGroups}
          viewOnly={viewOnly}
          onClose={(saved) => {
            setEditing(false)
            if (saved) setPicked([])
          }}
        />
      )}
      {fitted ? (
        <FitDeck lead={fitLead} sections={fitSections} list={list} lines={view === "list"} />
      ) : (
        <div className="relative -m-1 mt-2 flex min-h-0 flex-col gap-7 overflow-y-auto overscroll-contain p-1 lg:flex-1">
          {SECTIONS.map(section)}
        </div>
      )}
      {problems.length > 0 && (
        <Note warn title={labels.invalidDeckTitle}>
          {/* A problem about one card starts with its name ("Lillia, Fae Fawn: at most 3 copies…"), which stands out. */}
          {problems.map((problem, i) => {
            const at = problem.indexOf(": ")
            return (
              <Fragment key={problem}>
                {i > 0 && " "}
                {at < 0 ? problem : <><strong>{problem.slice(0, at)}</strong>{problem.slice(at)}</>}.
              </Fragment>
            )
          })}
          {!viewOnly && " It saves anyway, marked invalid in your decks until it’s complete."}
        </Note>
      )}
    </div>
  )
}

/** The whole deck at once, for the viewer. A column one card wide leads: the legend, its runes (little more than
    colours) side by side beneath it, then the battlefields stacked, as wide as the legend while the height allows. The
    main deck (the chosen champion first) and sideboard follow, each filling the height in columns, the cards as large
    as still lets every one show. Every block has a heading; grouped by type, the main deck and sideboard split into
    headed subsections side by side. `lines` (the list view): the same, with lines in columns all one width, as many
    columns as stay readable (fitLines), the lead column one of them. */
function FitDeck({
  lead,
  sections,
  list,
  lines,
}: {
  lead: { legend: DraftLine[][]; runes: DraftLine[][]; battlefields: DraftLine[][] }
  sections: { label: string; count?: string; subs: { label?: string; groups: DraftLine[][] }[] }[]
  list: (groups: DraftLine[][], label: string, tracks: React.CSSProperties) => React.ReactNode
  lines: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(ref.current!)
    return () => observer.disconnect()
  }, [])
  const { legend, runes, battlefields } = lead
  // A list line's height, read from the page once one shows (the kit sets it); 64px until then.
  const [lineHeight, setLineHeight] = useState(64)
  // A hard limit: if a layout still overflows (a heading or gap the sums below don't know of), the overflow comes off
  // the space and the cards shrink to fit. It holds for this space and these cards; any change starts afresh.
  const key = [
    lines,
    lineHeight,
    box.width,
    box.height,
    legend.length,
    runes.length,
    battlefields.length,
    ...sections.flatMap((s) => s.subs.map((sub) => sub.groups.length)),
  ].join()
  const [trim, setTrim] = useState({ key: "", width: 0, height: 0 })
  const cut = trim.key === key ? trim : { width: 0, height: 0 }
  useLayoutEffect(() => {
    const el = ref.current!
    const line = lines && el.querySelector("[data-card-line]")?.getBoundingClientRect().height
    if (line && Math.abs(line - lineHeight) > 0.5) return setLineHeight(line)
    const over = { width: Math.max(0, el.scrollWidth - el.clientWidth), height: Math.max(0, el.scrollHeight - el.clientHeight) }
    // Never past half the space, so a stubborn overflow can't shrink the deck away.
    if ((over.width || over.height) && cut.height + over.height < box.height / 2 && cut.width + over.width < box.width / 2)
      setTrim({ key, width: cut.width + over.width, height: cut.height + over.height })
    // `key` holds everything the layout depends on; a trim re-measures, until nothing overflows.
  }, [key, cut.width, cut.height, box.width, box.height, lines, lineHeight])
  const width = box.width - cut.width
  const height = box.height - cut.height
  // The spacing in pixels, matching the classes below: gap-2 between cards, gap-4 between subsections and between the
  // lead column's blocks, gap-10 between sections. A heading is its line (globals.css) and the gap under it.
  const [gap, subGap, sectionGap, leadGap] = [8, 16, 40, 16]
  const [labelHeight, subLabelHeight] = [20 + 8, 18 + 6]
  const hasLead = legend.length + runes.length + battlefields.length > 0
  const hasSubs = sections.some((s) => s.subs.some((sub) => sub.label))
  const cardsHeight = height - labelHeight - (hasSubs ? subLabelHeight : 0)
  const groups = [
    ...(hasLead ? [{ count: 1, ratio: PORTRAIT }] : []),
    // Subsections sit subGap apart; a new section adds the rest of sectionGap before its first.
    ...sections.flatMap((s, i) =>
      s.subs.map((sub, j) => ({ count: sub.groups.length, ratio: PORTRAIT, extra: j === 0 && (i > 0 || hasLead) ? sectionGap - subGap : 0 }))
    ),
  ]
  const sized = fitCards(groups, width, cardsHeight, gap, subGap)
  // 17.5rem keeps a one-row line's name readable beside its colours, count, tags and edit key.
  const lined = fitLines(groups, width, Math.floor((cardsHeight + gap) / (lineHeight + gap)), gap, subGap, 280)
  const { rows, cardHeight: h } = lines ? { rows: lined.rows, cardHeight: lined.columnWidth } : sized
  // In the list, the lead column is one line column; its blocks' lines are those columns' width.
  const cardWidth = lines ? lined.columnWidth : h * PORTRAIT
  const lineTracks = (count: number) => ({ gridTemplateRows: `repeat(${count}, ${lineHeight}px)`, gridAutoColumns: `${lined.columnWidth}px` })
  // Two runes share the legend's width (one takes half of it, so a lone rune stays small too).
  const runeHeight = (cardWidth - gap) / 2 / PORTRAIT
  // The battlefields take what the legend and runes leave, never wider than the legend.
  const blocks = [legend, runes, battlefields].filter((b) => b.length > 0).length
  const left =
    height -
    blocks * labelHeight -
    (legend.length ? h + leadGap : 0) -
    (runes.length ? runeHeight + leadGap : 0) -
    (battlefields.length - 1) * gap
  const fieldHeight = Math.floor(Math.min(cardWidth / LANDSCAPE, left / battlefields.length))
  const tracks = (height: number, ratio: number, count = 1) => ({
    gridTemplateRows: `repeat(${count}, ${height}px)`,
    gridAutoColumns: `${height * ratio}px`,
  })
  const leadBlock = (label: string, groups: DraftLine[][], style: React.CSSProperties) => (
    <section aria-label={label} className="flex flex-col gap-2">
      <DeckLabel label={label} />
      {list(groups, label, style)}
    </section>
  )
  return (
    // -m-1 p-1: room for the picked outlines and the champion's ring, which overflow-hidden would cut.
    <div ref={ref} className="relative -m-1 mt-2 flex min-h-0 flex-1 gap-10 overflow-hidden p-1">
      {h > 0 && hasLead && (
        <div className="flex shrink-0 flex-col gap-4" style={{ width: cardWidth }}>
          {legend.length > 0 && leadBlock("Legend", legend, lines ? lineTracks(legend.length) : tracks(h, PORTRAIT))}
          {runes.length > 0 && leadBlock("Runes", runes, lines ? lineTracks(runes.length) : tracks(runeHeight, PORTRAIT))}
          {battlefields.length > 0 &&
            (lines || fieldHeight > 0) &&
            leadBlock(
              "Battlefields",
              battlefields,
              lines ? lineTracks(battlefields.length) : tracks(fieldHeight, LANDSCAPE, battlefields.length)
            )}
        </div>
      )}
      {h > 0 &&
        sections.map((s) => (
          <section key={s.label} aria-label={s.label} className="flex shrink-0 flex-col gap-2">
            <DeckLabel label={s.label} count={s.count} />
            <div className="flex gap-4">
              {s.subs.map((sub) => (
                <div key={sub.label ?? s.label} className="flex flex-col gap-1.5">
                  {sub.label && <DeckLabel label={sub.label} count={sub.groups.flat().reduce((sum, l) => sum + l.quantity, 0)} sub />}
                  {list(sub.groups, sub.label ? `${s.label}: ${sub.label}` : s.label, lines ? lineTracks(rows) : tracks(h, PORTRAIT, rows))}
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

/** The builder, started from the saved deck (or empty for a new one). */
function DeckBuilder({ deck }: { deck?: Deck }) {
  const draft = useDeckDraft(deck)
  const router = useRouter()
  const [reviewing, setReviewing] = useState(false)
  return (
    <>
      <PageHeader
        title={draft.title}
        actions={
          <div className="flex gap-2">
            <ImportDialog draft={draft} />
            <Button render={<Link href="/decks" />}>Cancel</Button>
            {/* Straight to saving only when every copy is available and within the collection; otherwise a look over first. */}
            <Button
              variant="primary"
              onClick={async () => (draft.toReview.length ? setReviewing(true) : (await draft.save()) && router.push("/decks"))}
            >
              {labels.saveDeck}
            </Button>
            {reviewing && (
              <ReviewStatuses
                draft={draft}
                title={labels.reviewSaveTitle}
                intro="These cards aren't all in your hands (available or borrowed), or the deck counts more copies than you have. Check each against your collection, then save."
                confirm={labels.saveDeck}
                onClose={async (deck) => {
                  setReviewing(false)
                  if (deck && (await draft.save(deck))) router.push("/decks")
                }}
              />
            )}
          </div>
        }
      />
      <Field className="max-w-sm">
        <FieldLabel>{labels.deckName}</FieldLabel>
        <Input value={draft.name} onValueChange={draft.setName} placeholder={draft.title} />
      </Field>
      <ErrorAlert message={draft.error} />
      {/* From lg up, browsing takes two thirds of the window and the deck one: they share its leftover height,
          browsing scrolls inside, and the deck's small stamps are sized to show whole. On smaller screens they stack. */}
      <div className="grid gap-6 lg:min-h-0 lg:grid-cols-[3fr_2fr] lg:grid-rows-[minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardHeader>
            <CardTitle>{labels.browseDeckCards}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <Browser draft={draft} />
          </CardContent>
        </Card>
        <Card className="min-h-0">
          <CardHeader>
            <CardTitle>{labels.deckCards}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <DeckPane draft={draft} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function SignedOut() {
  return (
    <EmptyState title="Sign in to build and keep your decks." media={<Image src={mark} alt="" width={160} height={160} priority />}>
      <SignIn />
    </EmptyState>
  )
}

/** /decks/new builds a new deck; /decks/<id> edits one of the member's own. */
export function DeckBuilderPage({ id }: { id: string }) {
  const session = useSession()
  const { loading, decks } = useMyDecks()
  if (session.loading) return <EmptyState title="Loading…" />
  if (!session.signedIn) return <SignedOut />
  if (id === "new") return <DeckBuilder />
  if (loading) return <EmptyState title="Loading…" />
  const deck = decks.find((d) => d._id === id)
  if (!deck)
    return (
      <EmptyState title="That deck isn't one of yours, or it's gone.">
        <Button render={<Link href="/decks" />}>Back to decks</Button>
      </EmptyState>
    )
  // Keyed: opening another deck starts its builder afresh.
  return <DeckBuilder key={deck._id} deck={deck} />
}

/** A saved deck across the whole window, to look over: the builder's deck pane with its filters and views, where
    cards can change status (saved straight away) but not come or go. Mounted only while open. */
function DeckViewer({ deck, title, open, onOpenChange }: { deck: Deck; title: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="primary" aria-label={labels.viewDeck(title)} />}>
        <EyeIcon aria-hidden="true" />
        View
      </DialogTrigger>
      <DialogBackdrop />
      <DialogContent data-sheet="full" className="flex flex-col">
        <DialogClose variant="icon" />
        <DeckView deck={deck} title={title} />
      </DialogContent>
    </Dialog>
  )
}

function DeckView({ deck, title }: { deck: Deck; title: string }) {
  const draft = useDeckDraft(deck)
  return (
    // data-deck-viewer: the viewer's larger counts and tags (globals.css).
    <div data-deck-viewer="" className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Edit beside the title, clear of the corner close key (pr-9), so the cards keep the height. */}
      <div className="flex items-start gap-4 pr-9">
        <DialogHeader className="min-w-0 flex-1">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Change a card&apos;s status here, like marking it arrived. To add or take out cards, edit the deck.</DialogDescription>
        </DialogHeader>
        {/* In line with the close key: the same 28px height (sm), raised to its 14px top from the sheet's 20px padding. */}
        <div className="-mt-1.5 flex gap-2">
          <ExportDialog title={title} lines={draft.lines} />
          <Button size="sm" aria-label={labels.editDeck(title)} render={<Link href={`/decks/${deck._id}`} />}>
            <PencilIcon aria-hidden="true" />
            Edit deck
          </Button>
        </div>
      </div>
      <ErrorAlert message={draft.error} />
      <DeckPane draft={draft} viewOnly />
    </div>
  )
}

/** A deck's exports, a tab each: the sectioned list, a buy list and the deck code other deck sites read. */
const EXPORTS = [
  { value: "text", label: labels.deckList, about: "The deck as text, ready to paste into a deck tool or back into an import." },
  { value: "buyList", label: "Buy list", about: "Every card once, its copies across the whole deck (sideboard, runes and battlefields too) added up." },
  { value: "code", label: "Deck code", about: "The code Piltover Archive and other Riftbound deck sites import." },
] as const

function ExportDialog({ title, lines }: { title: string; lines: DraftLine[] }) {
  // A new key each opening starts the dialog afresh: the deck list, nothing copied yet.
  const [opened, setOpened] = useState(0)
  return (
    <Dialog onOpenChange={(open: boolean) => open && setOpened((n) => n + 1)}>
      <DialogTrigger render={<Button size="sm" aria-label={labels.exportDeck(title)} />}>
        <ShareIcon aria-hidden="true" />
        Export
      </DialogTrigger>
      <DialogBackdrop />
      <DialogContent className="flex flex-col [--dialog-width:32rem]">
        <DialogClose variant="icon" />
        <ExportFormats key={opened} title={title} lines={lines} />
      </DialogContent>
    </Dialog>
  )
}

function ExportFormats({ title, lines }: { title: string; lines: DraftLine[] }) {
  const [format, setFormat] = useState<(typeof EXPORTS)[number]["value"]>("text")
  const [copied, setCopied] = useState(false)
  const [buyStatus, setBuyStatus] = useState<DeckStatus | "">("")
  const exports = useDeckExports(lines, buyStatus || undefined)
  const text = exports[format]
  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{EXPORTS.find((e) => e.value === format)?.about}</DialogDescription>
      </DialogHeader>
      <Tabs
        value={format}
        onValueChange={(v) => {
          setFormat(v as typeof format)
          setCopied(false)
        }}
        className="flex flex-col gap-3"
      >
        <TabsList aria-label={labels.exportFormat}>
          {EXPORTS.map((e) => (
            <TabsTab key={e.value} value={e.value}>
              {e.label}
            </TabsTab>
          ))}
        </TabsList>
        {EXPORTS.map((e) => (
          <TabsPanel key={e.value} value={e.value}>
            {e.value === "code" && exports.codeProblem ? (
              <Note warn>{exports.codeProblem}</Note>
            ) : (
              <div className="flex flex-col gap-3">
                {/* A buy list of only, say, the cards not in the collection: what's left to buy. */}
                {e.value === "buyList" && (
                  <ChoiceSelect
                    label={labels.buyStatus}
                    options={[
                      { value: "", label: "Every card" },
                      ...STATUSES.filter((s) => lines.some((l) => l.status === s.status)).map((s) => ({ value: s.status, label: s.label, icon: <StatusIcon status={s.status} /> })),
                    ]}
                    value={buyStatus}
                    onValueChange={(status) => {
                      setBuyStatus(status)
                      setCopied(false)
                    }}
                  />
                )}
                <Field>
                  <FieldLabel className="sr-only">{e.label}</FieldLabel>
                  <Textarea value={exports[e.value]} readOnly />
                </Field>
              </div>
            )}
          </TabsPanel>
        ))}
      </Tabs>
      <DialogFooter>
        <Button
          variant="primary"
          disabled={!text}
          onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true), () => setCopied(false))}
        >
          {copied && <CheckIcon aria-hidden="true" />}
          {copied ? "Copied" : labels.copyExport(EXPORTS.find((e) => e.value === format)!.label)}
        </Button>
      </DialogFooter>
    </div>
  )
}

function DeleteDeckDialog({ title, onDelete }: { title: string; onDelete: () => void }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="destructive" aria-label={labels.deleteDeck(title)} />}>
        <Trash2Icon aria-hidden="true" />
        Delete
      </DialogTrigger>
      <DialogBackdrop />
      <DialogContent>
        <div className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Delete {title}?</DialogTitle>
            <DialogDescription>The list goes for good. Your collection and loans stay as they are.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button />}>Keep it</DialogClose>
            <DialogClose render={<Button variant="destructive" onClick={onDelete} />}>Delete deck</DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** One saved deck. A click anywhere on the row opens the viewer, except on the row's own buttons and links or inside
    a dialog (React events bubble out of portals). */
function DeckRow({ deck, onDelete }: { deck: Deck; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const lines = deckLines(deck)
  const title = deckTitle(deck.name, lines)
  const legend = lines.find((l) => l.zone === "legend")?.card
  const total = lines.filter((l) => l.zone === "main" || l.zone === "champion").reduce((sum, l) => sum + l.quantity, 0)
  const away = statusCounts(lines)
  const { problems } = deckIssues(lines)
  return (
    <TableRow
      data-clickable=""
      onClick={(event) => {
        const target = event.target as Element
        if (event.currentTarget.contains(target) && !target.closest("button, a, input")) setOpen(true)
      }}
    >
      <TableCell data-col="main">
        <Item className="sm:min-w-56">
          {legend && (
            <ItemMedia>
              <CardArt src={legend.imageUrl} size={32} />
            </ItemMedia>
          )}
          <ItemContent>
            <ItemTitle className="block max-w-full truncate" title={title}>
              {title}
            </ItemTitle>
            <ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {total} / 40 cards · {formatDate(deck.updatedAt)}
              {/* Saved unfinished or illegal: it says so, and why on hover. */}
              {problems.length > 0 && (
                <Badge variant="destructive" title={problems.join(". ")}>
                  {labels.invalidDeck}
                </Badge>
              )}
            </ItemDescription>
          </ItemContent>
        </Item>
      </TableCell>
      <TableCell data-label="Colours">
        <Domains domains={legend?.domains} />
      </TableCell>
      <TableCell data-label="Not in hand">
        <span className="flex flex-wrap gap-1">
          {away.size === 0 ? (
            <Badge variant="outline">All in hand</Badge>
          ) : (
            STATUSES.filter((s) => away.has(s.status)).map((s) => (
              <Badge key={s.status} variant="secondary">
                {s.label} {away.get(s.status)}
              </Badge>
            ))
          )}
        </span>
      </TableCell>
      <TableCell data-col="end">
        <span className="flex flex-wrap gap-2">
          <DeckViewer deck={deck} title={title} open={open} onOpenChange={setOpen} />
          <Button size="sm" aria-label={labels.editDeck(title)} render={<Link href={`/decks/${deck._id}`} />}>
            <PencilIcon aria-hidden="true" />
            Edit
          </Button>
          <ExportDialog title={title} lines={lines} />
          <DeleteDeckDialog title={title} onDelete={onDelete} />
        </span>
      </TableCell>
    </TableRow>
  )
}

function MyDecks() {
  const { loading, decks, remove } = useMyDecks()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.myDecks}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {decks.length === 0 ? (
          <EmptyNote>{loading ? "Loading…" : "No decks yet. Build one, or import a list."}</EmptyNote>
        ) : (
          <Table aria-label={labels.myDecks} data-flow="">
            <TableHeader>
              <TableRow>
                <TableHead>Deck</TableHead>
                <TableHead>Colours</TableHead>
                <TableHead>Not in hand</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decks.map((deck) => (
                <DeckRow key={deck._id} deck={deck} onDelete={() => remove(deck)} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function DecksPage() {
  const session = useSession()
  if (session.loading) return <EmptyState title="Loading…" />
  if (!session.signedIn) return <SignedOut />
  return (
    <>
      <PageHeader
        title="Decks"
        actions={
          <Button variant="primary" render={<Link href="/decks/new" />}>
            <PlusIcon aria-hidden="true" />
            {labels.newDeck}
          </Button>
        }
      />
      <MyDecks />
    </>
  )
}
