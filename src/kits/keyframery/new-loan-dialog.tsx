"use client"

import { InfoIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { useLoanDraft } from "@/core/loans"
import { Badge } from "@/kits/keyframery/ui/badge"
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
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia } from "@/kits/keyframery/ui/item"
import { CardName, CardSearch, CardThumb } from "./cards"
import { Copies, ErrorAlert, PartyField } from "./fields"

export function NewLoanDialog() {
  const draft = useLoanDraft()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="primary" />}>{labels.newLoan}</DialogTrigger>
      <DialogBackdrop />
      <DialogContent className="[--dialog-width:44rem]">
        {/* Three groups, who / what / done, spaced wider apart than anything inside them. */}
        <div className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{labels.loanDialog}</DialogTitle>
          </DialogHeader>

          <PartyField label={labels.borrower} options={draft.borrowerOptions} value={draft.borrower} onValueChange={draft.setBorrower} />

          <div className="flex flex-col gap-3">
            <CardSearch label={labels.addCard} onPick={draft.addCard} />
            {draft.items.length > 0 && (
              <ul aria-label={labels.loanCards} className="flex flex-col gap-2">
                {draft.items.map((item) => (
                  <li key={item.card._id}>
                    <Item variant="outline" size="sm">
                      <ItemMedia>
                        <CardThumb src={item.card.imageUrl} size={32} />
                      </ItemMedia>
                      <CardName card={item.card}>
                        {item.poolNote && <Badge variant="secondary">{item.poolNote}</Badge>}
                      </CardName>
                      <ItemActions>
                        <Copies
                          label={labels.cardCopies(cardLabel(item.card))}
                          hideLabel
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
                      </ItemActions>
                    </Item>
                  </li>
                ))}
              </ul>
            )}
            {draft.poolSummary && (
              // Kit Alerts are always role="alert"; this is information, so it's a polite status instead.
              <div role="status">
                <Item variant="muted" size="sm">
                  <ItemMedia variant="icon">
                    <InfoIcon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemDescription>{draft.poolSummary}</ItemDescription>
                  </ItemContent>
                </Item>
              </div>
            )}
          </div>

          <ErrorAlert message={draft.error} />

          <DialogFooter>
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
