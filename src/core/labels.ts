import { formatDate } from "./format"

/** Accessible names every kit must use, so people, agents and the shared tests find the same controls. */
export const labels = {
  signIn: "Sign in",
  signOut: "Sign out",
  signInToLend: "Sign in to record a loan",
  newLoan: "New loan",
  loanDialog: "Record a loan",
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
  filterPool: "Filter the shared collection",
  pool: "Shared collection",
  myOffers: "My collection",
  copiesToOffer: "Copies to add",
  cardToOffer: "Add a card to my collection",
  offeredCopies: (card: string) => `Copies of ${card} in my collection`,
  withdraw: (card: string) => `Remove ${card} from my collection`,
  lentByMe: "Cards I've lent",
  borrowedByMe: "Cards I've borrowed",
} as const
