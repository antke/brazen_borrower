"use client"

import { CheckCheckIcon, Undo2Icon } from "lucide-react"
import { useState } from "react"
import { cardLabel } from "@/core/cards"
import { formatDate } from "@/core/format"
import { labels } from "@/core/labels"
import { useMarkReturned, useReturnCards, type Loan } from "@/core/loans"
import { Button } from "@/kits/keyframery/ui/button"
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
import { Item } from "@/kits/keyframery/ui/item"
import { CardRow, LoanCards } from "./cards"
import { Copies, ErrorAlert } from "./fields"

/** A loan's cards at a glance, opening into the whole loan: every card, and (while it's out) which
    copies came back. Returning some moves them to Returned and leaves the rest out. The row around
    it opens the same dialog through `open`. */
export function LoanDetailsDialog({
  loan,
  canReturn,
  open,
  onOpenChange,
}: {
  loan: Loan
  canReturn: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const returnCards = useReturnCards()
  const markReturned = useMarkReturned()
  const [back, setBack] = useState<Record<string, number>>({})
  const [error, setError] = useState("")
  const editable = canReturn && loan.returnedAt === undefined
  const coming = Object.values(back).reduce((sum, n) => sum + n, 0)
  const cardList = loan.items
    .map((item) => (item.card?.name ?? "Unknown card") + (item.quantity > 1 ? " × " + item.quantity : ""))
    .join("\n")

  function setOpen(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setBack({})
      setError("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* w-full min-w-0: the button fills the Cards column instead of growing with its text, so the
          names line can cut off with "…"; hovering it lists every card, one per line. */}
      <DialogTrigger
        render={
          <Item
            size="sm"
            render={<button type="button" />}
            aria-label={labels.loanDetails(loan)}
            title={cardList}
            className="w-full min-w-0"
          />
        }
      >
        <LoanCards items={loan.items} />
      </DialogTrigger>
      <DialogBackdrop />
      {/* Like the new-loan dialog: never taller than the window, and only the card list scrolls. */}
      <DialogContent className="flex flex-col [--dialog-width:40rem]">
        {/* The X in the corner closes it, so the footer keeps only the loan's actions. */}
        <DialogClose variant="icon" />
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <DialogHeader>
            <DialogTitle>
              {loan.lender.name} → {loan.borrower.name}
            </DialogTitle>
            <DialogDescription>
              Lent {formatDate(loan.lentAt)}
              {loan.returnedAt !== undefined && ` · Returned ${formatDate(loan.returnedAt)}`}
            </DialogDescription>
          </DialogHeader>

          {/* relative -m-1 p-1: see the new-loan dialog's list. */}
          <ul aria-label={labels.loanCards} className="relative -m-1 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-1">
            {loan.items.map((item) => (
              <li key={item.cardId}>
                {item.card ? (
                  <CardRow card={item.card} detail={`× ${item.quantity}`}>
                    {editable && (
                      <Copies
                        label={labels.copiesBack(cardLabel(item.card))}
                        hideLabel
                        min={0}
                        max={item.quantity}
                        value={back[item.cardId] ?? 0}
                        onValueChange={(n) => setBack((b) => ({ ...b, [item.cardId]: n }))}
                      />
                    )}
                  </CardRow>
                ) : (
                  "Unknown card"
                )}
              </li>
            ))}
          </ul>

          <ErrorAlert message={error} />

          {/* Only a loan that's still out has actions; on a phone they share the width half and half. */}
          {editable && (
            <DialogFooter className="mt-auto max-sm:grid max-sm:grid-cols-2">
              <Button
                onClick={() => {
                  markReturned(loan)
                  setOpen(false)
                }}
              >
                <CheckCheckIcon aria-hidden="true" />
                {labels.returnAll}
              </Button>
              <Button
                variant="primary"
                disabled={coming === 0}
                onClick={async () => {
                  const message = await returnCards(loan, back)
                  if (message) setError(message)
                  else setOpen(false)
                }}
              >
                <Undo2Icon aria-hidden="true" />
                {labels.returnSome}
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
