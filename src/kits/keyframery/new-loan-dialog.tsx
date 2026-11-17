"use client"

import { InfoIcon, PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { useLoanDraft } from "@/core/loans"
import { Button } from "@/kits/keyframery/ui/button"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/kits/keyframery/ui/dialog"
import { Item, ItemContent, ItemDescription, ItemMedia } from "@/kits/keyframery/ui/item"
import { CardRow, CardSearch } from "./cards"
import { Copies, EmptyNote, ErrorAlert, PartyField } from "./fields"

export function NewLoanDialog() {
  const draft = useLoanDraft()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* One button, placed by kit.css (data-fab): beside the page title on wider screens, and the round +
          in the window's corner on a phone, where its words stay for screen readers only. */}
      <DialogTrigger render={<Button variant="primary" data-fab="" />}>
        <PlusIcon aria-hidden="true" />
        <span className="max-sm:sr-only">{labels.newLoan}</span>
      </DialogTrigger>
      <DialogBackdrop />
      {/* Never taller than the window (a bottom sheet on phones, kit.css): everything keeps its height
          except the list of cards, which scrolls, and the footer stays at the bottom. */}
      <DialogContent className="flex flex-col [--dialog-width:44rem]">
        {/* Three groups, who / what / done, spaced wider apart than anything inside them. */}
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{labels.loanDialog}</DialogTitle>
          </DialogHeader>

          <PartyField label={labels.borrower} options={draft.borrowerOptions} value={draft.borrower} onValueChange={draft.setBorrower} />

          <div className="flex min-h-0 flex-col gap-3">
            <CardSearch label={labels.addCard} onPick={draft.addCard} suggestions={draft.myCardIds} suggestionsLabel="Your collection" />
            {/* On desktop the cards get a fixed area, about five cards tall, so the dialog doesn't grow with
                every card: the list scrolls inside it, and the note below takes its room from the list.
                The list is relative: the stepper labels hidden for screen readers are positioned, and would
                otherwise escape its scrolling and stretch the whole dialog. -m-1 p-1 gives the item outlines
                room inside the scroll box, which would otherwise clip them at the sides. */}
            <div className="flex min-h-0 flex-col gap-3 sm:h-[28rem]">
              {draft.items.length > 0 ? (
                <ul aria-label={labels.loanCards} className="relative -m-1 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-1 sm:flex-1">
                  {draft.items.map((item) => (
                    <li key={item.card._id}>
                      <CardRow
                        card={item.card}
                        // A card from your collection shows how many copies it has free; the stepper stops there.
                        detail={item.free === undefined ? undefined : item.free + " free"}
                        note={item.poolNote || undefined}
                        noteShort={item.poolNoteShort || undefined}
                      >
                        <Copies
                          label={labels.cardCopies(cardLabel(item.card))}
                          hideLabel
                          max={item.max}
                          value={item.quantity}
                          onValueChange={(quantity) => draft.setQuantity(item.card, quantity)}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={labels.removeCard(cardLabel(item.card))}
                          onClick={() => draft.removeCard(item.card)}
                        >
                          <XIcon aria-hidden="true" />
                        </Button>
                      </CardRow>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyNote>No cards yet. Search for one above.</EmptyNote>
                </div>
              )}
              {draft.poolSummary && (
                // Kit Alerts are always role="alert"; this is information, so it's a polite status instead.
                <div role="status">
                  <Item variant="muted" size="sm">
                    <ItemMedia variant="icon">
                      <InfoIcon aria-hidden="true" />
                    </ItemMedia>
                    <ItemContent>
                      {/* Unclamped: the kit cuts descriptions at two lines, and this sentence has to be read whole. */}
                      <ItemDescription className="line-clamp-none">{draft.poolSummary}</ItemDescription>
                    </ItemContent>
                  </Item>
                </div>
              )}
            </div>
          </div>

          <ErrorAlert message={draft.error} />

          <DialogFooter className="mt-auto">
            <DialogClose render={<Button />}>Cancel</DialogClose>
            <Button variant="primary" onClick={async () => (await draft.save()) && setOpen(false)}>
              {labels.saveLoan}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
