"use client"

import { Undo2Icon } from "lucide-react"
import { useState } from "react"
import { formatDate } from "@/core/format"
import { labels } from "@/core/labels"
import { useLoans, useMarkReturned, type Loan } from "@/core/loans"
import { useSession } from "@/core/people"
import { Badge } from "@/kits/keyframery/ui/badge"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent } from "@/kits/keyframery/ui/card"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/kits/keyframery/ui/tabs"
import { PersonSelect, SearchInput } from "./fields"
import { LoanTable } from "./loan-table"
import { NewLoanDialog } from "./new-loan-dialog"
import { PageHeader, SignIn } from "./shell"

export function ReturnButton({ loan }: { loan: Loan }) {
  const markReturned = useMarkReturned()
  return (
    <Button aria-label={labels.markReturned(loan)} onClick={() => markReturned(loan)}>
      <Undo2Icon aria-hidden="true" />
      Mark returned
    </Button>
  )
}

export function LoansPage() {
  const session = useSession()
  const loans = useLoans()
  // Out now and returned are tabs, so the list you're reading gets the whole height.
  const [tab, setTab] = useState<"out" | "returned">("out")
  const action = session.loading ? null : session.signedIn ? <NewLoanDialog /> : <SignIn label={labels.signInToLend} />

  return (
    <>
      <PageHeader title="Loans" actions={action} />
      {/* One filter for both tabs: who lent, who borrowed, and which cards. On a phone the two people
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
          <SearchInput value={loans.filter.cards} onValueChange={(cards) => loans.setFilter({ cards })} placeholder="Card name, set or number" />
        </Field>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "out" | "returned")} className="gap-3">
            <TabsList aria-label={labels.loanLists}>
              <TabsTab value="out">
                Out now
                {!loans.loading && <Badge variant="secondary" count={loans.out.length} />}
              </TabsTab>
              <TabsTab value="returned">
                Returned
                {!loans.loading && <Badge variant="secondary" count={loans.returned.length} />}
              </TabsTab>
            </TabsList>
            <TabsPanel value="out">
              <LoanTable
                label={labels.outNow}
                loans={loans.out}
                empty={loans.loading ? "Loading…" : loans.filtering ? "No loans out match these filters." : "Nothing is out on loan."}
                extra={session.signedIn ? { header: "Action", cell: (loan) => <ReturnButton loan={loan} /> } : undefined}
                canReturn={session.signedIn}
              />
            </TabsPanel>
            <TabsPanel value="returned">
              <LoanTable
                label={labels.returned}
                loans={loans.returned}
                empty={loans.loading ? "Loading…" : loans.filtering ? "No returns match these filters." : "No returns yet."}
                extra={{ header: "Returned", label: "Returned", cell: (loan) => formatDate(loan.returnedAt!) }}
              />
            </TabsPanel>
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}
