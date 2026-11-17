"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { CardList } from "@/components/card-search"
import { NewLoanDialog } from "@/components/new-loan-dialog"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"

type Loan = NonNullable<ReturnType<typeof useQuery<typeof api.loans.list>>>[number]

const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })

export default function LoansPage() {
  const loans = useQuery(api.loans.list)
  const markReturned = useMutation(api.loans.markReturned)

  const base: Column<Loan>[] = [
    { header: "Lent", cell: (l) => date(l.lentAt), className: "whitespace-nowrap" },
    { header: "Lender", cell: (l) => l.lender },
    { header: "Borrower", cell: (l) => l.borrower },
    { header: "Cards", cell: (l) => <CardList items={l.items} /> },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Loans</h1>
        <NewLoanDialog />
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Out now</h2>
        <DataTable
          label="Cards out now"
          rows={loans?.filter((l) => l.returnedAt === undefined) ?? []}
          rowKey={(l) => l._id}
          empty={loans ? "Nothing is out on loan." : "Loading…"}
          columns={[
            ...base,
            {
              header: "Action",
              cell: (l) => (
                <Button
                  variant="secondary"
                  aria-label={`Mark returned: ${l.lender} to ${l.borrower}, ${date(l.lentAt)}`}
                  onClick={() => void markReturned({ id: l._id })}
                >
                  Mark returned
                </Button>
              ),
            },
          ]}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Returned</h2>
        <DataTable
          label="Returned loans"
          rows={loans?.filter((l) => l.returnedAt !== undefined) ?? []}
          rowKey={(l) => l._id}
          empty="No returns yet."
          columns={[...base, { header: "Returned", cell: (l) => date(l.returnedAt!), className: "whitespace-nowrap" }]}
        />
      </section>
    </div>
  )
}
