"use client"

import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, LayoutGridIcon, ListIcon, Trash2Icon } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { DOMAINS } from "@/core/decks"
import { useSession } from "@/core/people"
import { useMyOffers, type CollectionSortKey, type CollectionView } from "@/core/pool"
import mark from "@/images/borrower_mark.png"
import { Badge } from "@/kits/keyframery/ui/badge"
import { Button } from "@/kits/keyframery/ui/button"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/kits/keyframery/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { AddCardsDialog } from "./add-cards-dialog"
import { CardCell, CardTile, DomainIcon, Domains } from "./cards"
import { ChoiceSelect, Copies, EmptyNote, EmptyState, ErrorAlert, SearchInput } from "./fields"
import { NewLoanDialog } from "./new-loan-dialog"
import { PageHeader, SignIn } from "./shell"

const VIEWS: { value: CollectionView; label: string; empty: string }[] = [
  { value: "all", label: "All", empty: "Your collection is empty. Add cards to start." },
  { value: "lent", label: "Cards lent", empty: "You haven't lent any cards out." },
  { value: "borrowed", label: "Cards borrowed", empty: "You aren't borrowing any cards." },
]

type Offers = ReturnType<typeof useMyOffers>

type Row = Offers["rows"][number]
type Layout = "list" | "grid"

const SORT_OPTIONS: { value: CollectionSortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "copies", label: "Copies" },
  { value: "lent", label: "Lent out" },
  { value: "borrowed", label: "Borrowed" },
  { value: "available", label: "Free copies" },
]

const rowName = (row: Row) => (row.card ? cardLabel(row.card) : "Unknown card")

/** The copies stepper for a card the member owns. Never below the copies lent out: those have to come back first. */
function RowCopies({ offers, row }: { offers: Offers; row: Row }) {
  const { offer } = row
  if (!offer) return null
  return (
    <Copies
      label={labels.offeredCopies(rowName(row))}
      hideLabel
      min={Math.max(1, offer.lent)}
      value={offer.quantity}
      onValueChange={(n) => void offers.setRowCopies(offer, n)}
    />
  )
}

/** Removes an owned card. Borrowed cards aren't the member's to remove; they leave when the loan is returned. */
function RowRemove({ offers, row }: { offers: Offers; row: Row }) {
  const { offer } = row
  if (!offer) return null
  return (
    <Button
      variant="destructive"
      size="icon-sm"
      aria-label={labels.withdraw(rowName(row))}
      // A card with copies out on loan stays until they're returned.
      disabled={offer.lent > 0}
      title={offer.lent > 0 ? "Some copies are lent out; mark them returned first" : "Remove from my collection"}
      onClick={() => void offers.withdraw(offer)}
    >
      <Trash2Icon aria-hidden="true" />
    </Button>
  )
}

/** Where a card's copies are: free to lend (lit when there are some), lent out, borrowed. */
function holding(row: Row) {
  return [
    ...(row.offer ? [{ key: "free", text: `${row.offer.available} free`, lit: row.offer.available > 0 }] : []),
    ...(row.offer?.lent ? [{ key: "lent", text: `${row.offer.lent} lent`, lit: false }] : []),
    ...(row.borrowed ? [{ key: "borrowed", text: `${row.borrowed} borrowed`, lit: false }] : []),
  ]
}

function HoldingBadges({ row }: { row: Row }) {
  return (
    // A span: it sits inside the card's description, which is a <p>.
    <span className="flex flex-wrap gap-1">
      {holding(row).map((h) => (
        <Badge key={h.key} variant={h.lit ? "default" : "secondary"}>
          {h.text}
        </Badge>
      ))}
    </span>
  )
}

/** Three columns, so each card has room: the card with its type and colours, its copies, and removing it. */
function CollectionList({ offers }: { offers: Offers }) {
  return (
    <Table aria-label={labels.myOffers}>
      <TableHeader>
        <TableRow>
          <TableHead sort={offers.sortOf("name")} onSort={(direction) => offers.sortBy("name", direction)}>
            Card
          </TableHead>
          <TableHead sort={offers.sortOf("copies")} onSort={(direction) => offers.sortBy("copies", direction)}>
            Copies
          </TableHead>
          <TableHead>
            <span className="sr-only">Remove</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.rows.map((row) => (
          <TableRow key={row.cardId}>
            <TableCell data-col="main">
              {row.card ? (
                <CardCell card={row.card} artSize={56}>
                  {row.card.type}
                  <Domains domains={row.card.domains} />
                  {/* Where the copies are is secondary, so it sits with the card's details, not beside the stepper. */}
                  <HoldingBadges row={row} />
                </CardCell>
              ) : (
                rowName(row)
              )}
            </TableCell>
            <TableCell data-label="Copies">
              <RowCopies offers={offers} row={row} />
            </TableCell>
            <TableCell>
              <RowRemove offers={offers} row={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Big art, to find a card by sight: the copies owned on the art, where they are under the name, the controls below. */
function CollectionGrid({ offers }: { offers: Offers }) {
  return (
    // relative -m-1 p-1: room for the tile outlines inside the scroll box.
    <ul
      aria-label={labels.myOffers}
      className="relative -m-1 grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] content-start gap-3 overflow-y-auto overscroll-contain p-1"
    >
      {offers.rows.map((row) =>
        row.card ? (
          <li key={row.cardId}>
            <CardTile card={row.card} count={row.offer?.quantity} detail={holding(row).map((h) => h.text).join(" · ")}>
              {row.offer && (
                <div className="flex w-full items-center justify-between gap-2">
                  <RowCopies offers={offers} row={row} />
                  <RowRemove offers={offers} row={row} />
                </div>
              )}
            </CardTile>
          </li>
        ) : null,
      )}
    </ul>
  )
}

/** In rows: what to show (tabs, list or grid), then search, type and order, then colours. */
function CollectionControls({ offers, layout, setLayout }: { offers: Offers; layout: Layout; setLayout: (layout: Layout) => void }) {
  const descending = offers.sort.direction === "descending"
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList aria-label={labels.collectionView}>
          {VIEWS.map((v) => (
            <TabsTab key={v.value} value={v.value}>
              {v.label}
              <Badge variant="secondary" count={offers.count(v.value)} />
            </TabsTab>
          ))}
        </TabsList>
        <div role="group" aria-label={labels.collectionLayout} className="flex gap-1">
          {(["list", "grid"] as const).map((l) => (
            <Button
              key={l}
              size="icon"
              variant={layout === l ? "primary" : "default"}
              aria-pressed={layout === l}
              aria-label={l === "grid" ? labels.deckAsGrid : labels.deckAsList}
              title={l === "grid" ? labels.deckAsGrid : labels.deckAsList}
              onClick={() => setLayout(l)}
            >
              {l === "grid" ? <LayoutGridIcon aria-hidden="true" /> : <ListIcon aria-hidden="true" />}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Field>
          <FieldLabel>{labels.filterCollection}</FieldLabel>
          <SearchInput value={offers.filter} onValueChange={offers.setFilter} placeholder="Card name, set or number" />
        </Field>
        <ChoiceSelect
          label={labels.filterType}
          options={[{ value: "", label: "Any type" }, ...offers.types.map((t) => ({ value: t, label: t }))]}
          value={offers.type}
          onValueChange={offers.setType}
        />
        <div className="flex items-end gap-1.5">
          <ChoiceSelect label={labels.sortCollection} options={SORT_OPTIONS} value={offers.sort.key} onValueChange={offers.setSortKey} />
          <Button size="icon" aria-label={labels.reverseSort} aria-pressed={descending} title={labels.reverseSort} onClick={offers.flipSort}>
            {descending ? <ArrowDownWideNarrowIcon aria-hidden="true" /> : <ArrowUpNarrowWideIcon aria-hidden="true" />}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DOMAINS.map((d) => {
          const on = offers.domains.includes(d)
          return (
            <Button
              key={d}
              size="sm"
              variant={on ? "primary" : "default"}
              aria-pressed={on}
              aria-label={labels.filterColour(d)}
              onClick={() => offers.setDomains(on ? offers.domains.filter((x) => x !== d) : [...offers.domains, d])}
            >
              <DomainIcon domain={d} />
              {d}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function MyOffers() {
  const offers = useMyOffers()
  const [layout, setLayout] = useState<Layout>("list")
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.myOffers}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorAlert message={offers.error} />
        <Tabs value={offers.view} onValueChange={(v) => offers.setView(v as CollectionView)} className="gap-3">
          <CollectionControls offers={offers} layout={layout} setLayout={setLayout} />
          {VIEWS.map((v) => (
            <TabsPanel key={v.value} value={v.value}>
              {offers.rows.length === 0 ? (
                <EmptyNote>{offers.loading ? "Loading…" : offers.filtering ? "Nothing matches those filters." : v.empty}</EmptyNote>
              ) : layout === "grid" ? (
                <CollectionGrid offers={offers} />
              ) : (
                <CollectionList offers={offers} />
              )}
            </TabsPanel>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export function MePage() {
  const session = useSession()
  if (session.loading) return <EmptyState title="Loading…" />
  if (!session.signedIn)
    return (
      <EmptyState
        title="Sign in to manage your cards and see your loans."
        media={<Image src={mark} alt="" width={160} height={160} priority />}
      >
        <SignIn />
      </EmptyState>
    )
  return (
    <>
      <PageHeader
        title={session.me?.name ?? "Me"}
        actions={
          <div className="flex items-center gap-2">
            <AddCardsDialog />
            <NewLoanDialog />
          </div>
        }
      />
      <MyOffers />
    </>
  )
}
