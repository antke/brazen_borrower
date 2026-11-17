import { render, screen } from "@testing-library/react"
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

describe.each(kitCases)("%s kit: pool", (_, { PoolPage }) => {
  test("the pool is read-only, and an agent can filter it", async () => {
    render(<PoolPage />)
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    const result = await agent.act({ steps: [{ ref: labels.filterPool, action: "setValue", args: ["bob"] }] })
    expect(result.ok, result.error?.message).toBe(true)
    const table = screen.getByRole("table", { name: labels.pool })
    expect(table.textContent).toContain("Fury Rune · OGN 007")
    expect(table.textContent).not.toContain("Pouty Poro")
  })

  test("an empty pool says so", () => {
    queries["pool:list"] = []
    render(<PoolPage />)
    expect(screen.getByText("No cards offered yet.")).toBeTruthy()
  })
})
