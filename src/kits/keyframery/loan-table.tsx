"use client"

import { useState, type ReactNode } from "react"
import { formatDate } from "@/core/format"
import type { Loan } from "@/core/loans"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { EmptyNote } from "./fields"
import { LoanDetailsDialog } from "./loan-details-dialog"

/** A last column; `label` names its value when a phone shows it beside the cards (an action needs none). */
type Extra = { header: string; label?: string; cell: (loan: Loan) => ReactNode }

export function LoanTable({
  label,
  loans,
  empty,
  extra,
  canReturn = false,
}: {
  label: string
  loans: Loan[]
  empty: string
  extra?: Extra
  /** Whether a loan's dialog lets you return some of its cards. */
  canReturn?: boolean
}) {
  if (loans.length === 0) return <EmptyNote>{empty}</EmptyNote>
  return (
    // Fixed column widths, so every loan table on a page lines up even when one has no last column;
    // Cards takes what's left.
    // Phones show it as a list instead (globals.css), so the minimum width only applies from sm up; its
    // labelled line wraps there, so it flows from the left (data-flow) rather than spreading.
    <Table aria-label={label} className="sm:min-w-[48rem] sm:table-fixed" data-flow="">
      <TableHeader>
        <TableRow>
          <TableHead className="w-32">Lent</TableHead>
          <TableHead className="w-40">Lender</TableHead>
          <TableHead className="w-44">Borrower</TableHead>
          <TableHead>Cards</TableHead>
          {extra && <TableHead className="w-36">{extra.header}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Rows change in place, with no animation (see globals.css). */}
        {loans.map((loan) => (
          <LoanRow key={loan._id} loan={loan} extra={extra} canReturn={canReturn} />
        ))}
      </TableBody>
    </Table>
  )
}

/** One loan. Its cards cell is the button that opens the loan; a click anywhere else on the row opens
    it too, except on the row's own controls or inside the dialog (React events bubble out of portals). */
function LoanRow({ loan, extra, canReturn }: { loan: Loan; extra?: Extra; canReturn: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <TableRow
      data-moves=""
      data-clickable=""
      onClick={(event) => {
        const target = event.target as Element
        if (event.currentTarget.contains(target) && !target.closest("button, a, input")) setOpen(true)
      }}
    >
      <TableCell data-label="Lent">{formatDate(loan.lentAt)}</TableCell>
      <TableCell data-label="Lender">{loan.lender.name}</TableCell>
      <TableCell data-label="Borrower">{loan.borrower.name}</TableCell>
      <TableCell data-col="main">
        <LoanDetailsDialog loan={loan} canReturn={canReturn} open={open} onOpenChange={setOpen} />
      </TableCell>
      {extra && (
        // An action sits on a phone's top line; a labelled value (a date) joins the line underneath.
        <TableCell data-col={extra.label ? undefined : "end"} data-label={extra.label}>
          {extra.cell(loan)}
        </TableCell>
      )}
    </TableRow>
  )
}
