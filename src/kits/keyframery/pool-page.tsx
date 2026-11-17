"use client"

import { labels } from "@/core/labels"
import { usePool } from "@/core/pool"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Input } from "@/kits/keyframery/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardCell } from "./cards"
import { EmptyNote } from "./fields"
import { PageHeader } from "./shell"

export function PoolPage() {
  const pool = usePool()

  return (
    <>
      <PageHeader title="Shared collection" />
      <Card>
        <CardHeader>
          <CardTitle>{"Everyone's cards"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field className="max-w-sm">
            <FieldLabel>{labels.filterPool}</FieldLabel>
            <Input value={pool.filter} onValueChange={pool.setFilter} placeholder="Card or owner" />
          </Field>
          {pool.rows.length === 0 ? (
            <EmptyNote>
              {pool.loading ? "Loading…" : pool.filter ? "Nothing matches that filter." : "Nobody has added cards yet."}
            </EmptyNote>
          ) : (
            <Table aria-label={labels.pool}>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Lent out</TableHead>
                  <TableHead>Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pool.rows.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell>
                      {row.card ? <CardCell card={row.card} /> : "Unknown card"}
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
