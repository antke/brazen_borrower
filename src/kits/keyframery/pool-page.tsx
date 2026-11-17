"use client"

import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { usePeopleOptions } from "@/core/people"
import { usePool, usePoolOffer } from "@/core/pool"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Input } from "@/kits/keyframery/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardSearch, CardThumb } from "./cards"
import { Copies, ErrorAlert, OptionSelect } from "./fields"
import { PageHeader } from "./shell"

export function PoolPage() {
  const people = usePeopleOptions()
  const offer = usePoolOffer()
  const pool = usePool()

  return (
    <>
      <PageHeader title="Community pool" />
      <Card>
        <CardHeader>
          <CardTitle>Offer a card</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_2fr]">
            <OptionSelect label={labels.owner} items={people} value={offer.owner} onValueChange={offer.setOwner} />
            <Copies label={labels.copiesToOffer} value={offer.copies} onValueChange={offer.setCopies} />
            <CardSearch label={labels.cardToOffer} onPick={offer.offer} />
          </div>
          <ErrorAlert message={offer.error} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cards on offer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field className="max-w-sm">
            <FieldLabel>{labels.filterPool}</FieldLabel>
            <Input value={pool.filter} onValueChange={pool.setFilter} placeholder="Card or owner" />
          </Field>
          <Table aria-label={labels.pool}>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Offered</TableHead>
                <TableHead>Lent out</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pool.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {pool.loading ? "Loading…" : "No cards offered yet."}
                  </TableCell>
                </TableRow>
              ) : (
                pool.rows.map((row) => {
                  const name = row.card ? cardLabel(row.card) : "Unknown card"
                  return (
                    <TableRow key={row._id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {row.card && <CardThumb src={row.card.imageUrl} />}
                          {name}
                        </span>
                      </TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{row.lent}</TableCell>
                      <TableCell className="font-semibold">{row.available}</TableCell>
                      <TableCell>
                        <Button variant="ghost" aria-label={labels.withdraw(name, row.owner)} onClick={() => pool.withdraw(row)}>
                          Withdraw
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
