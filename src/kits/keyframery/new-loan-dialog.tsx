"use client"

import { useState } from "react"
import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { useLoanDraft } from "@/core/loans"
import { useMemberOptions } from "@/core/people"
import { Button } from "@/kits/keyframery/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/kits/keyframery/ui/dialog"
import { CardSearch, CardThumb } from "./cards"
import { Copies, ErrorAlert, PartyField } from "./fields"

export function NewLoanDialog() {
  const members = useMemberOptions()
  const draft = useLoanDraft()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="primary" />}>{labels.newLoan}</DialogTrigger>
      <DialogContent className="[--dialog-width:36rem]">
        <DialogHeader>
          <DialogTitle>{labels.loanDialog}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <PartyField label={labels.lender} options={members} value={draft.lender} onValueChange={draft.setLender} />
            <PartyField label={labels.borrower} options={members} value={draft.borrower} onValueChange={draft.setBorrower} />
          </div>
          <CardSearch label={labels.addCard} onPick={draft.addCard} />
          {draft.items.length > 0 && (
            <ul aria-label={labels.loanCards} className="flex flex-col gap-2">
              {draft.items.map((item) => (
                <li key={item.card._id} className="flex items-center gap-3">
                  <CardThumb src={item.card.imageUrl} />
                  <span className="flex-1">{cardLabel(item.card)}</span>
                  <Copies
                    label={labels.cardCopies(cardLabel(item.card))}
                    hideLabel
                    value={item.quantity}
                    onValueChange={(quantity) => draft.setQuantity(item.card, quantity)}
                  />
                  <Button
                    variant="ghost"
                    aria-label={labels.removeCard(cardLabel(item.card))}
                    onClick={() => draft.removeCard(item.card)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <ErrorAlert message={draft.error} />
        </div>
        <DialogFooter>
          <DialogClose render={<Button />}>Cancel</DialogClose>
          <Button variant="primary" onClick={async () => (await draft.save()) && setOpen(false)}>
            {labels.saveLoan}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
