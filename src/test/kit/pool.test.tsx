import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { labels } from "@/core/labels"
import { catalogue, queries } from "@/test/convex-mock"
import { kitCases } from "./kits"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())

const agent = createAgent()

beforeEach(() => {
  queries["pool:list"] = [
    { _id: "e1", ownerId: "u2", cardId: "c3", quantity: 3, owner: "Bob", card: catalogue[2], lent: 1, available: 2 },
    { _id: "e2", ownerId: "u1", cardId: "c2", quantity: 1, owner: "Alice", card: catalogue[1], lent: 0, available: 1 },
  ]
})

describe.each(kitCases)("%s kit: shared collection", (_, { PoolPage }) => {
  test("the shared collection is read-only, and an agent can filter it", async () => {
    render(<PoolPage />)
    // Read-only: nothing here edits the collection. The buttons are the people (they just filter)
    // and the way to start a new loan.
    const buttons = screen.queryAllByRole("button").map((b) => b.getAttribute("aria-label") || b.textContent)
    expect(buttons.sort()).toEqual(["Alice", "Bob", labels.newLoan])
    const result = await agent.act({ steps: [{ ref: labels.filterPool, action: "setValue", args: ["bob"] }] })
    expect(result.ok, result.error?.message).toBe(true)
    const table = screen.getByRole("table", { name: labels.pool })
    expect(table.textContent).toContain("Fury Rune")
    expect(table.textContent).toContain("OGN 007")
    expect(table.textContent).not.toContain("Pouty Poro")
  })

  test("everyone in the group is listed, and pressing a name shows only their cards until pressed again", async () => {
    const user = userEvent.setup()
    render(<PoolPage />)
    expect(screen.getByText("2 people in the group")).toBeTruthy()
    const people = screen.getByRole("group", { name: labels.people })
    expect(people.textContent).toBe("AliceBob")

    await user.click(screen.getByRole("button", { name: "Alice" }))
    expect(screen.getByRole("button", { name: "Alice" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("table", { name: labels.pool }).textContent).not.toContain("Fury Rune")

    await user.click(screen.getByRole("button", { name: "Alice" }))
    expect(screen.getByRole("table", { name: labels.pool }).textContent).toContain("Fury Rune")
  })

  test("an empty shared collection says so", () => {
    queries["pool:list"] = []
    render(<PoolPage />)
    expect(screen.getByText("Nobody has added cards yet.")).toBeTruthy()
  })
})
