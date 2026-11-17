"use client"

import Image from "next/image"
import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { useMyLoans } from "@/core/loans"
import { useSession } from "@/core/people"
import { useMyOffers } from "@/core/pool"
import mark from "@/images/borrower_mark.png"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardCell, CardSearch } from "./cards"
import { Available, Copies, Count, EmptyNote, EmptyState, ErrorAlert } from "./fields"
import { LoanTable } from "./loan-table"
import { NewLoanDialog } from "./new-loan-dialog"
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
          <EmptyNote>{offers.loading ? "Loading…" : "Your collection is empty. Add a card above."}</EmptyNote>
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
                    <TableCell data-col="main">
                      {row.card ? <CardCell card={row.card} /> : name}
                    </TableCell>
                    <TableCell data-label="Copies">
                      {/* Never below the copies lent out: those have to come back first. */}
                      <Copies
                        label={labels.offeredCopies(name)}
                        hideLabel
                        min={Math.max(1, row.lent)}
                        value={row.quantity}
                        onValueChange={(n) => void offers.setRowCopies(row, n)}
                      />
                    </TableCell>
                    <TableCell data-label="Lent">
                      <Count value={row.lent} />
                    </TableCell>
                    <TableCell data-label="Available">
                      <Available value={row.available} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        aria-label={labels.withdraw(name)}
                        // A card with copies out on loan stays until they're returned.
                        disabled={row.lent > 0}
                        title={row.lent > 0 ? "Some copies are lent out; mark them returned first" : undefined}
                        onClick={() => void offers.withdraw(row)}
                      >
                        Remove
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>{labels.lentByMe}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable
            label={labels.lentByMe}
            loans={loans.lent}
            empty={loading ?? "You haven't lent any cards out."}
            extra={{ header: "Action", cell: (loan) => <ReturnButton loan={loan} /> }}
            canReturn
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{labels.borrowedByMe}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable label={labels.borrowedByMe} loans={loans.borrowed} empty={loading ?? "You aren't borrowing any cards."} />
        </CardContent>
      </Card>
    </>
  )
}

export function MePage() {
  const session = useSession()
  if (session.loading) return <EmptyState title="Loading…" />
  if (!session.signedIn)
    return (
      <EmptyState
        title="Sign in to manage your cards and see your loans."
        media={<Image src={mark} alt="" width={160} height={160} priority />}
      >
        <SignIn />
      </EmptyState>
    )
  return (
    <>
      <PageHeader title={session.me?.name ?? "Me"} actions={<NewLoanDialog />} />
      <MyOffers />
      <MyLoans />
    </>
  )
}
