"use client"

import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { CardSearch, type Card } from "@/components/card-search"
import { CardThumb } from "@/components/card-thumb"
import { errorMessage, usePeopleOptions } from "@/components/people"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { NumberField } from "@/components/ui/number-field"
import { SelectField } from "@/components/ui/select-field"
import { TextField } from "@/components/ui/text-field"
import { cardLabel } from "@/lib/search-cards"

export default function PoolPage() {
  const pool = useQuery(api.pool.list)
  const setOffer = useMutation(api.pool.set)
  const people = usePeopleOptions()
  const [owner, setOwner] = useState<string | null>(null)
  const [copies, setCopies] = useState(1)
  const [filter, setFilter] = useState("")
  const [error, setError] = useState("")

  async function offer(card: Card) {
    if (!owner) return setError("Choose whose card this is first")
    try {
      await setOffer({ ownerId: owner as Id<"people">, cardId: card._id, quantity: copies })
      setError("")
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const words = filter.trim().toLowerCase()
  const rows =
    pool?.filter((row) =>
      `${row.card ? cardLabel(row.card) : ""} ${row.owner}`.toLowerCase().includes(words)
    ) ?? []

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Community pool</h1>
      <section aria-labelledby="offer-heading" className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 id="offer-heading" className="text-lg font-semibold">Offer a card</h2>
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_2fr]">
          <SelectField label="Owner" items={people} value={owner} onValueChange={setOwner} />
          <NumberField label="Copies to offer" value={copies} onValueChange={setCopies} />
          <CardSearch label="Card to offer" onPick={offer} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <TextField label="Filter the pool" value={filter} onValueChange={setFilter} placeholder="Card or owner" className="max-w-sm" />
        <DataTable
          label="Community pool"
          rows={rows}
          rowKey={(r) => r._id}
          empty={pool ? "No cards offered yet." : "Loading…"}
          columns={[
            {
              header: "Card",
              cell: (r) => (
                <span className="flex items-center gap-2">
                  {r.card && <CardThumb src={r.card.imageUrl} />}
                  {r.card ? cardLabel(r.card) : "Unknown card"}
                </span>
              ),
            },
            { header: "Owner", cell: (r) => r.owner },
            { header: "Offered", cell: (r) => r.quantity },
            { header: "Lent out", cell: (r) => r.lent },
            { header: "Available", cell: (r) => <strong>{r.available}</strong> },
            {
              header: "Action",
              cell: (r) => (
                <Button
                  variant="ghost"
                  aria-label={`Withdraw ${r.card ? cardLabel(r.card) : "card"} offered by ${r.owner}`}
                  onClick={() => void setOffer({ ownerId: r.ownerId, cardId: r.cardId, quantity: 0 })}
                >
                  Withdraw
                </Button>
              ),
            },
          ]}
        />
      </section>
    </div>
  )
}
