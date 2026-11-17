import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { labels } from "@/core/labels"
import { catalogue, mutations, queries } from "@/test/convex-mock"
import { kitCases } from "./kits"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())

const agent = createAgent()
const openLoan = {
  _id: "l1", _creationTime: 1, lenderId: "p1", borrowerId: "p2", lender: "Alice", borrower: "Bob",
  lentAt: Date.UTC(2026, 10, 1), items: [{ cardId: "c2", quantity: 2, card: catalogue[1] }],
}

beforeEach(() => {
  for (const fn of Object.values(mutations)) fn.mockClear()
  queries["loans:list"] = [openLoan, { ...openLoan, _id: "l2", returnedAt: Date.UTC(2026, 10, 5) }]
})

describe.each(kitCases)("%s kit: loans", (_, { LoansPage }) => {
  test("an agent records a loan and marks one returned", async () => {
    render(<LoansPage />)
    const result = await agent.act({
      steps: [
        { ref: labels.newLoan, action: "press" },
        { ref: labels.lender, action: "setValue", args: ["Alice"] },
        { ref: labels.borrower, action: "setValue", args: ["Bob"] },
        { ref: labels.addCard, action: "setQuery", args: ["scorcher"] },
        { ref: labels.addCard, action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
        { ref: labels.saveLoan, action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(mutations["loans:create"]).toHaveBeenCalledWith({
      lenderId: "p1",
      borrowerId: "p2",
      items: [{ cardId: "c1", quantity: 1 }],
    })

    for (const e of agent.snapshot().filter((e) => !e.offPage && e.component !== "more"))
      expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy()

    const back = await agent.act({ steps: [{ ref: labels.markReturned(openLoan), action: "press" }] })
    expect(back.ok, back.error?.message).toBe(true)
    expect(mutations["loans:markReturned"]).toHaveBeenCalledWith({ id: "l1" })
  })

  test("loans are split into out now and returned", () => {
    render(<LoansPage />)
    expect(screen.getByRole("table", { name: labels.outNow }).textContent).toContain("Pouty Poro · OGN 013")
    expect(screen.getByRole("table", { name: labels.returned }).textContent).toContain("Alice")
    expect(screen.getAllByRole("button", { name: /^Mark returned/ })).toHaveLength(1)
  })

  test("a person picks a card with the keyboard, and saving without people is refused", async () => {
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
