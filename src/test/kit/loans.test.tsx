import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { labels } from "@/core/labels"
import { useLoans } from "@/core/loans"
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
  queries["pool:list"] = []
  session.me = members[0]
  queries["loans:list"] = [openLoan, { ...openLoan, _id: "l2", returnedAt: Date.UTC(2026, 10, 5) }]
})

describe.each(kitCases)("%s kit: loans", (_, { LoansPage }) => {
  test("an agent records a loan from the signed-in member to another member", async () => {
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
      borrower: { name: "Uncle Joe" },
      items: [{ cardId: "c2", quantity: 1 }],
    })
  })

  test("the borrower list leaves you out, and typing your own name is refused", async () => {
    const user = userEvent.setup()
    render(<LoansPage />)
    await user.click(screen.getByRole("button", { name: labels.newLoan }))
    expect(screen.queryAllByRole("option")).toHaveLength(0)
    // A click alone lists the members; nothing has to be typed first.
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
    expect(screen.getByRole("alert").textContent).toContain("You can't lend cards to yourself")
    expect(mutations["loans:create"]).not.toHaveBeenCalled()
  })

  test("cards that aren't in your collection are marked, and a card with every copy lent out can't be lent again", async () => {
    queries["pool:list"] = [
      { _id: "e2", ownerId: "u1", cardId: "c2", quantity: 1, owner: "Alice", card: catalogue[1], lent: 1, available: 0 },
    ]
    render(<LoansPage />)
    const result = await agent.act({
      steps: [
        { ref: labels.newLoan, action: "press" },
        { ref: labels.borrower, action: "setValue", args: ["Bob"] },
        { ref: labels.addCard, action: "setQuery", args: ["scorcher"] },
        { ref: labels.addCard, action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
        { ref: labels.addCard, action: "setQuery", args: ["poro"] },
        { ref: labels.addCard, action: "setValue", args: ["Pouty Poro · OGN 013"] },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    const cards = screen.getByRole("list", { name: labels.loanCards }).textContent
    expect(cards).toContain("New to your collection")
    // Your only Pouty Poro is already out, so it isn't added.
    expect(cards).not.toContain("Pouty Poro")
    expect(screen.getByRole("alert").textContent).toContain("Every copy of Pouty Poro in your collection is lent out")
    expect(screen.getByRole("status").textContent).toBe("Heads up: one or more of these aren't in your collection yet, so we'll add them when you save.")
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
    // The search empties after each pick, so the next card name can be typed straight away.
    expect(screen.getByRole<HTMLInputElement>("combobox", { name: labels.addCard }).value).toBe("")
    await user.type(screen.getByRole("combobox", { name: labels.addCard }), "scorcher")
    await user.keyboard("{ArrowDown}{Enter}")
    expect(screen.getByRole("list", { name: labels.loanCards }).textContent).toContain("Blazing Scorcher · OGN 001")
    expect(screen.getByRole<HTMLInputElement>("combobox", { name: labels.addCard }).value).toBe("")

    await user.click(screen.getByRole("button", { name: labels.saveLoan }))
    expect(screen.getByRole("alert").textContent).toContain("Who's borrowing? Pick someone or type a name")
    expect(mutations["loans:create"]).not.toHaveBeenCalled()
  })

  test("opening a loan lists its cards, and returning some of them sends only those copies back", async () => {
    const user = userEvent.setup()
    render(<LoansPage />)
    await user.click(screen.getByRole("button", { name: labels.loanDetails(openLoan) }))
    expect(screen.getByRole("list", { name: labels.loanCards }).textContent).toContain("Pouty Poro")
    const returnSome = screen.getByRole("button", { name: labels.returnSome })
    expect(returnSome.hasAttribute("disabled") || returnSome.getAttribute("aria-disabled") === "true").toBe(true)

    await user.click(screen.getByRole("button", { name: `Increase ${labels.copiesBack("Pouty Poro · OGN 013")}` }))
    await user.click(screen.getByRole("button", { name: labels.returnSome }))
    expect(mutations["loans:returnCards"]).toHaveBeenCalledWith({ id: "l1", items: [{ cardId: "c2", quantity: 1 }] })
  })

  test("an empty card search offers your own collection, and typing switches to the catalogue", async () => {
    queries["pool:list"] = [
      { _id: "e2", ownerId: "u1", cardId: "c2", quantity: 1, owner: "Alice", card: catalogue[1], lent: 0, available: 1 },
      { _id: "e3", ownerId: "u2", cardId: "c3", quantity: 1, owner: "Bob", card: catalogue[2], lent: 0, available: 1 },
    ]
    const user = userEvent.setup()
    render(<LoansPage />)
    await user.click(screen.getByRole("button", { name: labels.newLoan }))
    await user.click(screen.getByRole("combobox", { name: labels.addCard }))
    await user.keyboard("{ArrowDown}")
    // Only your own cards (Bob's Fury Rune isn't yours).
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Pouty Poro · OGN 013"])
    await user.keyboard("{Enter}")
    expect(screen.getByRole("list", { name: labels.loanCards }).textContent).toContain("Pouty Poro")

    await user.type(screen.getByRole("combobox", { name: labels.addCard }), "rune")
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Fury Rune · OGN 007"])
    queries["pool:list"] = []
  })

  test("both lists filter by who lent, who borrowed and which cards", async () => {
    const bobsLoan = {
      _id: "l3", _creationTime: 2, lender: { userId: "u2", name: "Bob" }, borrower: { name: "Carol" },
      lentAt: Date.UTC(2026, 10, 3), items: [{ cardId: "c3", quantity: 1, card: catalogue[2] }],
    }
    queries["loans:list"] = [openLoan, bobsLoan, { ...openLoan, _id: "l2", returnedAt: Date.UTC(2026, 10, 5) }]
    render(<LoansPage />)
    const out = () => screen.getByRole("table", { name: labels.outNow }).textContent

    let result = await agent.act({ steps: [{ ref: labels.filterBorrower, action: "setValue", args: ["Carol"] }] })
    expect(result.ok, result.error?.message).toBe(true)
    expect(out()).toContain("Carol")
    expect(out()).not.toContain("Uncle Joe")
    expect(screen.getByText("No returns match these filters.")).toBeTruthy()

    result = await agent.act({
      steps: [
        { ref: labels.filterBorrower, action: "setValue", args: [""] },
        { ref: labels.filterLoanCards, action: "setValue", args: ["poro"] },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(out()).toContain("Uncle Joe")
    expect(out()).not.toContain("Carol")
    expect(screen.getByRole("table", { name: labels.returned }).textContent).toContain("Uncle Joe")
  })

  test("whoever is picked as lender can't also be picked as borrower, and the other way round", () => {
    // Alice has lent (to Uncle Joe) and borrowed (from Bob), so she starts on both sides.
    queries["loans:list"] = [openLoan, { ...openLoan, _id: "l4", lender: { userId: "u2", name: "Bob" }, borrower: { userId: "u1", name: "Alice" } }]
    const { result } = renderHook(() => useLoans())
    expect(result.current.lenders).toContain("Alice")
    expect(result.current.borrowers).toContain("Alice")
    act(() => result.current.setFilter({ lender: "Alice" }))
    expect(result.current.borrowers).not.toContain("Alice")
    act(() => result.current.setFilter({ lender: "", borrower: "Alice" }))
    expect(result.current.lenders).not.toContain("Alice")
    expect(result.current.borrowers).toContain("Alice")
  })
})
