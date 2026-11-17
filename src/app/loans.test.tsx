import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, expect, test, vi } from "vitest"
import { catalogue, mutations, queries } from "@/test/convex-mock"
import LoansPage from "./page"

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

test("an agent records a loan and marks one returned", async () => {
  render(<LoansPage />)
  const result = await agent.act({
    steps: [
      { ref: "New loan", action: "press" },
      { ref: "Lender", action: "setValue", args: ["Alice"] },
      { ref: "Borrower", action: "setValue", args: ["Bob"] },
      { ref: "Add a card", action: "setQuery", args: ["scorcher"] },
      { ref: "Add a card", action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
      { ref: "Save loan", action: "press" },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(mutations["loans:create"]).toHaveBeenCalledWith({
    lenderId: "p1",
    borrowerId: "p2",
    items: [{ cardId: "c1", quantity: 1 }],
  })

  const components = agent.snapshot().filter((e) => !e.offPage && e.component !== "more")
  for (const e of components) expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy()

  const back = await agent.act({ steps: [{ ref: "Mark returned: Alice to Bob", action: "press" }] })
  expect(back.ok, back.error?.message).toBe(true)
  expect(mutations["loans:markReturned"]).toHaveBeenCalledWith({ id: "l1" })
})

test("loans are split into out now and returned", () => {
  render(<LoansPage />)
  expect(screen.getByRole("table", { name: "Cards out now" }).textContent).toContain("Pouty Poro · OGN 013 ×2")
  expect(screen.getByRole("table", { name: "Returned loans" }).textContent).toContain("Alice")
  expect(screen.getAllByRole("button", { name: /^Mark returned/ })).toHaveLength(1)
})

test("a person searches a card with the keyboard, and saving without people is refused", async () => {
  const user = userEvent.setup()
  render(<LoansPage />)
  await user.click(screen.getByRole("button", { name: "New loan" }))
  await user.type(screen.getByRole("combobox", { name: "Add a card" }), "poro")
  await user.keyboard("{ArrowDown}{Enter}")
  expect(screen.getByRole("list", { name: "Cards in this loan" }).textContent).toContain("Pouty Poro · OGN 013")

  await user.click(screen.getByRole("button", { name: "Save loan" }))
  expect(screen.getByRole("alert").textContent).toBe("Choose who lends and who borrows")
  expect(mutations["loans:create"]).not.toHaveBeenCalled()
})
