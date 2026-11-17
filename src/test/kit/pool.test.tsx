import { render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { labels } from "@/core/labels"
import { catalogue, mutations, queries } from "@/test/convex-mock"
import { kitCases } from "./kits"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())

const agent = createAgent()

beforeEach(() => {
  for (const fn of Object.values(mutations)) fn.mockClear()
  queries["pool:list"] = [
    { _id: "e1", ownerId: "p2", cardId: "c3", quantity: 3, owner: "Bob", card: catalogue[2], lent: 1, available: 2 },
    { _id: "e2", ownerId: "p1", cardId: "c2", quantity: 1, owner: "Alice", card: catalogue[1], lent: 0, available: 1 },
  ]
})

describe.each(kitCases)("%s kit: pool", (_, { PoolPage }) => {
  test("an agent offers copies of a card, filters the pool and withdraws an offer", async () => {
    render(<PoolPage />)
    const result = await agent.act({
      steps: [
        { ref: labels.owner, action: "setValue", args: ["Alice"] },
        { ref: labels.copiesToOffer, action: "setValue", args: [3] },
        { ref: labels.cardToOffer, action: "setQuery", args: ["scorcher"] },
        { ref: labels.cardToOffer, action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
        { ref: labels.filterPool, action: "setValue", args: ["bob"] },
        { ref: labels.withdraw("Fury Rune · OGN 007", "Bob"), action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ ownerId: "p1", cardId: "c1", quantity: 3 })
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ ownerId: "p2", cardId: "c3", quantity: 0 })

    const table = screen.getByRole("table", { name: labels.pool })
    expect(table.textContent).toContain("Fury Rune · OGN 007")
    expect(table.textContent).not.toContain("Pouty Poro")
    for (const e of agent.snapshot().filter((e) => !e.offPage && e.component !== "more"))
      expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy()
  })
})
