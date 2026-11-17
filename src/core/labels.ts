import { formatDate } from "./format"

/** Accessible names every kit must use, so people, agents and the shared tests find the same controls. */
export const labels = {
  newLoan: "New loan",
  loanDialog: "Record a loan",
  lender: "Lender",
  borrower: "Borrower",
  addCard: "Add a card",
  loanCards: "Cards in this loan",
  cardCopies: (card: string) => `Copies of ${card}`,
  removeCard: (card: string) => `Take ${card} off this loan`,
  saveLoan: "Save loan",
  outNow: "Cards out now",
  returned: "Returned loans",
  markReturned: (loan: { lender: string; borrower: string; lentAt: number }) =>
    `Mark returned: ${loan.lender} to ${loan.borrower}, ${formatDate(loan.lentAt)}`,
  owner: "Owner",
  copiesToOffer: "Copies to offer",
  cardToOffer: "Card to offer",
  filterPool: "Filter the pool",
  pool: "Community pool",
  withdraw: (card: string, owner: string) => `Withdraw ${card} offered by ${owner}`,
  personName: "Name",
  addPerson: "Add person",
  people: "People",
  kit: "Interface",
} as const
