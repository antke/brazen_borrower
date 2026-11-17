import { formatDate } from "./format"

/** Accessible names every kit must use, so people, agents and the shared tests find the same controls. */
export const labels = {
  signIn: "Sign in",
  signOut: "Sign out",
  signInToLend: "Sign in to record a loan",
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
  markReturned: (loan: { lender: { name: string }; borrower: { name: string }; lentAt: number }) =>
    `Mark returned: ${loan.lender.name} to ${loan.borrower.name}, ${formatDate(loan.lentAt)}`,
  filterPool: "Filter the pool",
  pool: "Community pool",
  myOffers: "My offers",
  copiesToOffer: "Copies to offer",
  cardToOffer: "Card to offer",
  offeredCopies: (card: string) => `Copies of ${card} on offer`,
  withdraw: (card: string) => `Withdraw ${card}`,
  lentByMe: "Cards I've lent",
  borrowedByMe: "Cards I've borrowed",
} as const
