"use client"

import { ListPlusIcon, PlusIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import type { Card } from "@/core/cards"
import { labels } from "@/core/labels"
import { useMyOffers } from "@/core/pool"
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
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Textarea } from "@/kits/keyframery/ui/textarea"
import { CardRow, CardSearch } from "./cards"
import { Copies, EmptyNote, ErrorAlert } from "./fields"

/** Adds cards to the member's collection. Each pick is saved at once and the dialog stays open, with the search
    empty, for the next card; the cards added since it opened stay listed, newest first. "Add a list" swaps the search
    for a box to type or paste "3 Card Name" lines into. */
export function AddCardsDialog() {
  const offers = useMyOffers()
  const [added, setAdded] = useState<{ card: Card; copies: number }[]>([])
  const [listing, setListing] = useState(false)
  const [text, setText] = useState("")
  const [listProblem, setListProblem] = useState("")

  // A card added twice is one line with both counts.
  const record = (card: Card, copies: number) =>
    setAdded((list) => {
      const before = list.find((a) => a.card._id === card._id)?.copies ?? 0
      return [{ card, copies: before + copies }, ...list.filter((a) => a.card._id !== card._id)]
    })

  async function add(card: Card) {
    const copies = offers.copies
    if (await offers.offer(card)) record(card, copies)
  }

  async function addList() {
    const { added: listed, problem } = await offers.addList(text)
    for (const { card, quantity } of listed) record(card, quantity)
    // What went in leaves the box; a list that added nothing stays, to fix.
    if (listed.length) setText("")
    setListProblem(problem)
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) return
        setAdded([])
        setListing(false)
        setListProblem("")
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon aria-hidden="true" />
        {labels.addCards}
      </DialogTrigger>
      <DialogBackdrop />
      {/* Never taller than the window: the list of added cards scrolls, everything else keeps its height. */}
      <DialogContent className="flex flex-col [--dialog-width:36rem]">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{labels.addCardsDialog}</DialogTitle>
          </DialogHeader>
          {listing ? (
            <div className="flex flex-col gap-3">
              <Field>
                <FieldLabel>{labels.cardList}</FieldLabel>
                <Textarea value={text} onValueChange={setText} placeholder={"1 Akali, Brash\n3 Fury Rune"} />
              </Field>
              <ErrorAlert message={listProblem} />
              <Button variant="primary" className="self-end" disabled={!text.trim()} onClick={() => void addList()}>
                <PlusIcon aria-hidden="true" />
                {labels.addListConfirm}
              </Button>
            </div>
          ) : (
            <div className="grid items-end gap-3 sm:grid-cols-[auto_1fr]">
              <Copies label={labels.copiesToOffer} value={offers.copies} onValueChange={offers.setCopies} />
              <CardSearch label={labels.cardToOffer} onPick={(card) => void add(card)} />
            </div>
          )}
          <ErrorAlert message={offers.error} />
          {/* A fixed area on desktop, like the loan dialog's, so the dialog doesn't grow with every card. -m-1 p-1:
              room for the item outlines inside the scroll box. */}
          <div className="flex min-h-0 flex-col sm:h-[20rem]">
            {added.length > 0 ? (
              <ul aria-label={labels.addedCards} className="relative -m-1 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-1 sm:flex-1">
                {added.map(({ card, copies }) => (
                  <li key={card._id}>
                    <CardRow card={card} detail={`+${copies}`} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyNote>Cards you add show up here.</EmptyNote>
              </div>
            )}
          </div>
          <DialogFooter className="mt-auto">
            {/* Bottom left, away from Done: switches between searching one card and pasting a list. */}
            <Button className="mr-auto" onClick={() => setListing(!listing)}>
              {listing ? <SearchIcon aria-hidden="true" /> : <ListPlusIcon aria-hidden="true" />}
              {listing ? labels.searchOneCard : labels.addList}
            </Button>
            <DialogClose render={<Button variant="primary" />}>Done</DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
