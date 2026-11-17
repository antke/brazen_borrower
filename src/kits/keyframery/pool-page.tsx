"use client"

import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { usePool } from "@/core/pool"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Input } from "@/kits/keyframery/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardThumb } from "./cards"
import { EmptyState } from "./fields"
import { PageHeader } from "./shell"

export function PoolPage() {
  const pool = usePool()

  return (
    <>
      <PageHeader title="Community pool" />
      <Card>
        <CardHeader>
          <CardTitle>Cards on offer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field className="max-w-sm">
            <FieldLabel>{labels.filterPool}</FieldLabel>
            <Input value={pool.filter} onValueChange={pool.setFilter} placeholder="Card or owner" />
          </Field>
          {pool.rows.length === 0 ? (
            <EmptyState
              title={pool.loading ? "Loading…" : pool.filter ? "Nothing matches that filter." : "No cards offered yet."}
            />
          ) : (
            <Table aria-label={labels.pool}>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Offered</TableHead>
                  <TableHead>Lent out</TableHead>
                  <TableHead>Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pool.rows.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {row.card && <CardThumb src={row.card.imageUrl} />}
                        {row.card ? cardLabel(row.card) : "Unknown card"}
                      </span>
                    </TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.lent}</TableCell>
                    <TableCell>{row.available}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
