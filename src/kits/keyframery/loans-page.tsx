"use client"

import { formatDate } from "@/core/format"
import { labels } from "@/core/labels"
import { useLoans, useMarkReturned, type Loan } from "@/core/loans"
import { useSession } from "@/core/people"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { LoanTable } from "./loan-table"
import { NewLoanDialog } from "./new-loan-dialog"
import { PageHeader, SignIn } from "./shell"

export function ReturnButton({ loan }: { loan: Loan }) {
  const markReturned = useMarkReturned()
  return (
    <Button aria-label={labels.markReturned(loan)} onClick={() => markReturned(loan)}>
      Mark returned
    </Button>
  )
}

export function LoansPage() {
  const session = useSession()
  const loans = useLoans()
  const action = session.loading ? null : session.signedIn ? <NewLoanDialog /> : <SignIn label={labels.signInToLend} />

  return (
    <>
      <PageHeader title="Loans" actions={action} />
      <Card>
        <CardHeader>
          <CardTitle>Out now</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable
            label={labels.outNow}
            loans={loans.out}
            empty={loans.loading ? "Loading…" : "Nothing is out on loan."}
            extra={session.signedIn ? { header: "Action", cell: (loan) => <ReturnButton loan={loan} /> } : undefined}
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
            empty={loans.loading ? "Loading…" : "No returns yet."}
            extra={{ header: "Returned", cell: (loan) => formatDate(loan.returnedAt!) }}
          />
        </CardContent>
      </Card>
    </>
  )
}
