"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { NumberField } from "@/components/ui/number-field"
import { SelectField } from "@/components/ui/select-field"
import { cardLabel } from "@/lib/search-cards"
import { CardSearch, type Card } from "./card-search"
import { CardThumb } from "./card-thumb"
import { errorMessage, usePeopleOptions } from "./people"

export function NewLoanDialog() {
  const people = usePeopleOptions()
  const create = useMutation(api.loans.create)
  const [open, setOpen] = useState(false)
  const [lender, setLender] = useState<string | null>(null)
  const [borrower, setBorrower] = useState<string | null>(null)
  const [items, setItems] = useState<{ card: Card; quantity: number }[]>([])
  const [error, setError] = useState("")

  const reset = () => {
    setLender(null)
    setBorrower(null)
    setItems([])
    setError("")
  }

  const addCard = (card: Card) =>
    setItems((current) =>
      current.some((i) => i.card._id === card._id)
        ? current.map((i) => (i.card._id === card._id ? { ...i, quantity: Math.min(99, i.quantity + 1) } : i))
        : [...current, { card, quantity: 1 }]
    )

  async function save() {
    if (!lender || !borrower) return setError("Choose who lends and who borrows")
    try {
      await create({
        lenderId: lender as Id<"people">,
        borrowerId: borrower as Id<"people">,
        items: items.map((i) => ({ cardId: i.card._id, quantity: i.quantity })),
      })
      reset()
      setOpen(false)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Dialog triggerLabel="New loan" title="Record a loan" open={open} onOpenChange={setOpen}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Lender" items={people} value={lender} onValueChange={setLender} />
        <SelectField label="Borrower" items={people} value={borrower} onValueChange={setBorrower} />
      </div>
      <CardSearch label="Add a card" onPick={addCard} />
      {items.length > 0 && (
        <ul aria-label="Cards in this loan" className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.card._id} className="flex items-center gap-3">
              <CardThumb src={item.card.imageUrl} />
              <span className="flex-1 text-sm">{cardLabel(item.card)}</span>
              <NumberField
                label={`Copies of ${cardLabel(item.card)}`}
                hideLabel
                value={item.quantity}
                onValueChange={(quantity) =>
                  setItems((current) => current.map((i) => (i.card._id === item.card._id ? { ...i, quantity } : i)))
                }
              />
              <Button
                variant="ghost"
                aria-label={`Take ${cardLabel(item.card)} off this loan`}
                onClick={() => setItems((current) => current.filter((i) => i.card._id !== item.card._id))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <Button onClick={save} className="self-end">
        Save loan
      </Button>
    </Dialog>
  )
}
