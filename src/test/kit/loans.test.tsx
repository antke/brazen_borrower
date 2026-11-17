import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { labels } from "@/core/labels"
import { catalogue, members, mutations, queries, session } from "@/test/convex-mock"
import { kitCases } from "./kits"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())

const agent = createAgent()
const openLoan = {
  _id: "l1", _creationTime: 1, lender: { userId: "u1", name: "Alice" }, borrower: { name: "Uncle Joe" },
  lentAt: Date.UTC(2026, 10, 1), items: [{ cardId: "c2", quantity: 2, card: catalogue[1] }],
}

beforeEach(() => {
  for (const fn of Object.values(mutations)) fn.mockClear()
  session.me = members[0]
  queries["loans:list"] = [openLoan, { ...openLoan, _id: "l2", returnedAt: Date.UTC(2026, 10, 5) }]
})

describe.each(kitCases)("%s kit: loans", (_, { LoansPage }) => {
  test("an agent records a loan to a member; the lender starts as the signed-in member", async () => {
    render(<LoansPage />)
    const result = await agent.act({
      steps: [
        { ref: labels.newLoan, action: "press" },
        { ref: labels.borrower, action: "setValue", args: ["Bob"] },
        { ref: labels.addCard, action: "setQuery", args: ["scorcher"] },
        { ref: labels.addCard, action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
        { ref: labels.saveLoan, action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(mutations["loans:create"]).toHaveBeenCalledWith({
      lender: { userId: "u1" },
      borrower: { userId: "u2" },
      items: [{ cardId: "c1", quantity: 1 }],
    })
    for (const e of agent.snapshot().filter((e) => !e.offPage && e.component !== "more"))
      expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy()
  })

  test("an agent lends to someone outside the app by typing their name", async () => {
    render(<LoansPage />)
    const result = await agent.act({
      steps: [
        { ref: labels.newLoan, action: "press" },
        { ref: labels.borrower, action: "setValue", args: ["Uncle Joe"] },
        { ref: labels.addCard, action: "setQuery", args: ["poro"] },
        { ref: labels.addCard, action: "setValue", args: ["Pouty Poro · OGN 013"] },
        { ref: labels.saveLoan, action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(mutations["loans:create"]).toHaveBeenCalledWith({
      lender: { userId: "u1" },
      borrower: { name: "Uncle Joe" },
      items: [{ cardId: "c2", quantity: 1 }],
    })
  })

  test("the borrower list leaves out the lender, and typing your own name is refused", async () => {
    const user = userEvent.setup()
    render(<LoansPage />)
    await user.click(screen.getByRole("button", { name: labels.newLoan }))
    await user.click(screen.getByRole("combobox", { name: labels.borrower }))
    const names = screen.getAllByRole("option").map((o) => o.textContent)
    expect(names).toContain("Bob")
    expect(names).not.toContain("Alice")

    const result = await agent.act({
      steps: [
        { ref: labels.borrower, action: "setValue", args: ["alice"] },
        { ref: labels.addCard, action: "setQuery", args: ["poro"] },
        { ref: labels.addCard, action: "setValue", args: ["Pouty Poro · OGN 013"] },
        { ref: labels.saveLoan, action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(screen.getByRole("alert").textContent).toContain("The lender and the borrower must be different people")
    expect(mutations["loans:create"]).not.toHaveBeenCalled()
  })

  test("a signed-in member marks a loan returned", async () => {
    render(<LoansPage />)
    const back = await agent.act({ steps: [{ ref: labels.markReturned(openLoan), action: "press" }] })
    expect(back.ok, back.error?.message).toBe(true)
    expect(mutations["loans:markReturned"]).toHaveBeenCalledWith({ id: "l1" })
  })

  test("signed out, loans are read-only and the page offers sign-in", () => {
    session.me = null
    render(<LoansPage />)
    expect(screen.queryByRole("button", { name: labels.newLoan })).toBeNull()
    expect(screen.queryByRole("button", { name: /^Mark returned/ })).toBeNull()
    expect(screen.getByRole("button", { name: labels.signInToLend })).toBeTruthy()
    expect(screen.getByRole("table", { name: labels.outNow }).textContent).toContain("Uncle Joe")
  })

  test("with no loans, both lists say so instead of loading", () => {
    queries["loans:list"] = []
    render(<LoansPage />)
    expect(screen.getByText("Nothing is out on loan.")).toBeTruthy()
    expect(screen.getByText("No returns yet.")).toBeTruthy()
  })

  test("a person picks a card with the keyboard, and saving without a borrower is refused", async () => {
    const user = userEvent.setup()
    render(<LoansPage />)
    await user.click(screen.getByRole("button", { name: labels.newLoan }))
    await user.type(screen.getByRole("combobox", { name: labels.addCard }), "poro")
    await user.keyboard("{ArrowDown}{Enter}")
    expect(screen.getByRole("list", { name: labels.loanCards }).textContent).toContain("Pouty Poro · OGN 013")

    await user.click(screen.getByRole("button", { name: labels.saveLoan }))
    expect(screen.getByRole("alert").textContent).toContain("Choose who lends and who borrows")
    expect(mutations["loans:create"]).not.toHaveBeenCalled()
  })
})
