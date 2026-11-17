"use client"

import { useState } from "react"
import { formatDate } from "@/core/format"
import { labels } from "@/core/labels"
import { useLoans, useMarkReturned, type Loan } from "@/core/loans"
import { useSession } from "@/core/people"
import { Badge } from "@/kits/keyframery/ui/badge"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/kits/keyframery/ui/card"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Input } from "@/kits/keyframery/ui/input"
import { PersonSelect } from "./fields"
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
  // On a phone the two lists are tabs, so the one you're reading gets the whole height.
  const [tab, setTab] = useState<"out" | "returned">("out")
  const action = session.loading ? null : session.signedIn ? <NewLoanDialog /> : <SignIn label={labels.signInToLend} />

  return (
    <>
      <PageHeader title="Loans" actions={action} />
      {/* One filter for both lists: who lent, who borrowed, and which cards. On a phone the two people
          share a row and the card search takes the next. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <PersonSelect
          label={labels.filterLender}
          names={loans.lenders}
          value={loans.filter.lender}
          onValueChange={(lender) => loans.setFilter({ lender })}
        />
        <PersonSelect
          label={labels.filterBorrower}
          names={loans.borrowers}
          value={loans.filter.borrower}
          onValueChange={(borrower) => loans.setFilter({ borrower })}
        />
        <Field className="col-span-2 sm:col-span-1">
          <FieldLabel>{labels.filterLoanCards}</FieldLabel>
          <Input value={loans.filter.cards} onValueChange={(cards) => loans.setFilter({ cards })} placeholder="Card name, set or number" />
        </Field>
      </div>
      <div role="group" aria-label={labels.loanLists} className="grid grid-cols-2 gap-1 sm:hidden">
        <Button variant={tab === "out" ? "default" : "ghost"} aria-pressed={tab === "out"} onClick={() => setTab("out")}>
          Out now{loans.loading ? "" : " · " + loans.out.length}
        </Button>
        <Button variant={tab === "returned" ? "default" : "ghost"} aria-pressed={tab === "returned"} onClick={() => setTab("returned")}>
          Returned{loans.loading ? "" : " · " + loans.returned.length}
        </Button>
      </div>
      <Card data-tone="live" className={tab === "out" ? undefined : "max-sm:hidden"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Out now
            {!loans.loading && <Badge count={loans.out.length} />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable
            label={labels.outNow}
            loans={loans.out}
            empty={loans.loading ? "Loading…" : loans.filtering ? "No loans out match these filters." : "Nothing is out on loan."}
            extra={session.signedIn ? { header: "Action", cell: (loan) => <ReturnButton loan={loan} /> } : undefined}
            canReturn={session.signedIn}
          />
        </CardContent>
      </Card>
      <Card data-tone="quiet" className={tab === "returned" ? undefined : "max-sm:hidden"}>
        <CardHeader>
          <CardTitle>Returned</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanTable
            label={labels.returned}
            loans={loans.returned}
            empty={loans.loading ? "Loading…" : loans.filtering ? "No returns match these filters." : "No returns yet."}
            extra={{ header: "Returned", label: "Returned", cell: (loan) => formatDate(loan.returnedAt!) }}
          />
        </CardContent>
      </Card>
    </>
  )
}
