"use client"

import { formatDate } from "@/core/format"
import { labels } from "@/core/labels"
import { useLoans, type Loan } from "@/core/loans"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardList } from "./cards"
import { NewLoanDialog } from "./new-loan-dialog"
import { PageHeader } from "./shell"

function LoanTable({
  label,
  loans,
  empty,
  last,
}: {
  label: string
  loans: Loan[]
  empty: string
  last: { header: string; cell: (loan: Loan) => React.ReactNode }
}) {
  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead>Lent</TableHead>
          <TableHead>Lender</TableHead>
          <TableHead>Borrower</TableHead>
          <TableHead>Cards</TableHead>
          <TableHead>{last.header}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          loans.map((loan) => (
            <TableRow key={loan._id}>
              <TableCell className="whitespace-nowrap">{formatDate(loan.lentAt)}</TableCell>
              <TableCell>{loan.lender}</TableCell>
              <TableCell>{loan.borrower}</TableCell>
              <TableCell>
                <CardList items={loan.items} />
              </TableCell>
              <TableCell>{last.cell(loan)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function LoansPage() {
  const loans = useLoans()
  return (
    <>
      <PageHeader title="Loans" actions={<NewLoanDialog />} />
      <Card>
        <CardHeader>
          <CardTitle>Out now</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable
            label={labels.outNow}
            loans={loans.out}
            empty={loans.loading ? "Loading…" : "Nothing is out on loan."}
            last={{
              header: "Action",
              cell: (loan) => (
                <Button aria-label={labels.markReturned(loan)} onClick={() => loans.markReturned(loan)}>
                  Mark returned
                </Button>
              ),
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Returned</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable
            label={labels.returned}
            loans={loans.returned}
            empty="No returns yet."
            last={{ header: "Returned", cell: (loan) => formatDate(loan.returnedAt!) }}
          />
        </CardContent>
      </Card>
    </>
  )
}
