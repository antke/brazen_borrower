"use client"

import { labels } from "@/core/labels"
import { useMembers, useSession } from "@/core/people"
import { usePool } from "@/core/pool"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Input } from "@/kits/keyframery/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardCell } from "./cards"
import { Available, Count, EmptyNote } from "./fields"
import { NewLoanDialog } from "./new-loan-dialog"
import { PageHeader } from "./shell"

export function PoolPage() {
  const pool = usePool()
  const session = useSession()
  const names = useMembers()?.map((m) => m.name) ?? []

  return (
    <>
      <PageHeader title="Shared collection" actions={session.signedIn && <NewLoanDialog />} />
      <Card>
        <CardHeader>
          <CardTitle>{"Everyone's cards"}</CardTitle>
          {names.length > 0 && (
            <CardDescription>{names.length === 1 ? "1 person in the group" : `${names.length} people in the group`}</CardDescription>
          )}
          {names.length > 0 && (
            // Who's in the group at a glance; a name is also a shortcut to their cards, pressed again to clear.
            <div role="group" aria-label={labels.people} className="mt-2 flex flex-wrap gap-1.5">
              {names.map((name) => {
                const active = pool.filter.trim().toLowerCase() === name.toLowerCase()
                return (
                  <Button
                    key={name}
                    size="sm"
                    variant={active ? "primary" : "default"}
                    aria-pressed={active}
                    onClick={() => pool.setFilter(active ? "" : name)}
                  >
                    {name}
                  </Button>
                )
              })}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
                    <TableCell data-col="main">
                      {row.card ? <CardCell card={row.card} /> : "Unknown card"}
                    </TableCell>
                    <TableCell data-strong="">{row.owner}</TableCell>
                    <TableCell data-label="Copies">
                      <Count value={row.quantity} />
                    </TableCell>
                    <TableCell data-label="Lent">
                      <Count value={row.lent} />
                    </TableCell>
                    <TableCell data-label="Available">
                      <Available value={row.available} />
                    </TableCell>
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
