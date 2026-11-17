"use client"

import type { ReactNode } from "react"
import { formatDate } from "@/core/format"
import type { Loan } from "@/core/loans"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/kits/keyframery/ui/table"
import { CardList } from "./cards"
import { EmptyNote } from "./fields"

export function LoanTable({
  label,
  loans,
  empty,
  extra,
}: {
  label: string
  loans: Loan[]
  empty: string
  extra?: { header: string; cell: (loan: Loan) => ReactNode }
}) {
  if (loans.length === 0) return <EmptyNote>{empty}</EmptyNote>
  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead>Lent</TableHead>
          <TableHead>Lender</TableHead>
          <TableHead>Borrower</TableHead>
          <TableHead>Cards</TableHead>
          {extra && <TableHead>{extra.header}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans.map((loan) => (
          <TableRow key={loan._id}>
            <TableCell>{formatDate(loan.lentAt)}</TableCell>
            <TableCell>{loan.lender.name}</TableCell>
            <TableCell>{loan.borrower.name}</TableCell>
            <TableCell>
              <CardList items={loan.items} />
            </TableCell>
            {extra && <TableCell>{extra.cell(loan)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
