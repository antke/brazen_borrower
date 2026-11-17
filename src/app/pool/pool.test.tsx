import { render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { expect, test, vi } from "vitest"
import { catalogue, mutations, queries } from "@/test/convex-mock"
import PoolPage from "./page"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())

test("an agent offers copies of a card and filters the pool", async () => {
  queries["pool:list"] = [
    { _id: "e1", ownerId: "p2", cardId: "c3", quantity: 3, owner: "Bob", card: catalogue[2], lent: 1, available: 2 },
    { _id: "e2", ownerId: "p1", cardId: "c2", quantity: 1, owner: "Alice", card: catalogue[1], lent: 0, available: 1 },
  ]
  const agent = createAgent()
  render(<PoolPage />)

  const result = await agent.act({
    steps: [
      { ref: "Owner", action: "setValue", args: ["Alice"] },
      { ref: "Copies to offer", action: "setValue", args: [3] },
      { ref: "Card to offer", action: "setQuery", args: ["scorcher"] },
      { ref: "Card to offer", action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
      { ref: "Filter the pool", action: "setValue", args: ["bob"] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(mutations["pool:set"]).toHaveBeenCalledWith({ ownerId: "p1", cardId: "c1", quantity: 3 })

  const table = screen.getByRole("table", { name: "Community pool" })
  expect(table.textContent).toContain("Fury Rune · OGN 007")
  expect(table.textContent).not.toContain("Pouty Poro")
  for (const e of agent.snapshot().filter((e) => !e.offPage && e.component !== "more"))
    expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy()
})
