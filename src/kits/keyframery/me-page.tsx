"use client"

import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { useMyLoans } from "@/core/loans"
import { useSession } from "@/core/people"
import { useMyOffers } from "@/core/pool"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardSearch, CardThumb } from "./cards"
import { Copies, EmptyState, ErrorAlert } from "./fields"
import { LoanTable } from "./loan-table"
import { ReturnButton } from "./loans-page"
import { PageHeader, SignIn } from "./shell"

function MyOffers() {
  const offers = useMyOffers()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.myOffers}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid items-end gap-3 sm:grid-cols-[auto_1fr]">
          <Copies label={labels.copiesToOffer} value={offers.copies} onValueChange={offers.setCopies} />
          <CardSearch label={labels.cardToOffer} onPick={offers.offer} />
        </div>
        <ErrorAlert message={offers.error} />
        {offers.rows.length === 0 ? (
          <EmptyState title={offers.loading ? "Loading…" : "You aren't offering any cards yet."} />
        ) : (
          <Table aria-label={labels.myOffers}>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Copies</TableHead>
                <TableHead>Lent out</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.rows.map((row) => {
                const name = row.card ? cardLabel(row.card) : "Unknown card"
                return (
                  <TableRow key={row._id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {row.card && <CardThumb src={row.card.imageUrl} />}
                        {name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Copies
                        label={labels.offeredCopies(name)}
                        hideLabel
                        value={row.quantity}
                        onValueChange={(n) => void offers.setRowCopies(row, n)}
                      />
                    </TableCell>
                    <TableCell>{row.lent}</TableCell>
                    <TableCell>{row.available}</TableCell>
                    <TableCell>
                      <Button variant="ghost" aria-label={labels.withdraw(name)} onClick={() => void offers.withdraw(row)}>
                        Withdraw
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function MyLoans() {
  const loans = useMyLoans()
  const loading = loans.loading ? "Loading…" : undefined
  return (
    <Card>
      <CardHeader>
        <CardTitle>My loans</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoanTable
          label={labels.lentByMe}
          loans={loans.lent}
          empty={loading ?? "You haven't lent any cards out."}
          extra={{ header: "Action", cell: (loan) => <ReturnButton loan={loan} /> }}
        />
        <LoanTable
          label={labels.borrowedByMe}
          loans={loans.borrowed}
          empty={loading ?? "You aren't borrowing any cards."}
        />
      </CardContent>
    </Card>
  )
}

export function MePage() {
  const session = useSession()
  if (session.loading) return <EmptyState title="Loading…" />
  if (!session.signedIn)
    return (
      <EmptyState title="Sign in to manage your cards and see your loans.">
        <SignIn />
      </EmptyState>
    )
  return (
    <>
      <PageHeader title={session.me?.name ?? "Me"} />
      <MyOffers />
      <MyLoans />
    </>
  )
}
