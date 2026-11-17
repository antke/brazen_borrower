import { render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { labels } from "@/core/labels"
import { catalogue, members, mutations, queries, session } from "@/test/convex-mock"
import { kitCases } from "./kits"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())

const agent = createAgent()

beforeEach(() => {
  for (const fn of Object.values(mutations)) fn.mockClear()
  session.me = members[0]
  queries["pool:mine"] = [
    { _id: "e2", ownerId: "u1", cardId: "c2", quantity: 2, owner: "Alice", card: catalogue[1], lent: 1, available: 1 },
  ]
  queries["loans:mine"] = [
    {
      _id: "l1", lender: { userId: "u1", name: "Alice" }, borrower: { name: "Uncle Joe" },
      lentAt: Date.UTC(2026, 10, 1), items: [{ cardId: "c2", quantity: 1, card: catalogue[1] }],
    },
    {
      _id: "l3", lender: { userId: "u2", name: "Bob" }, borrower: { userId: "u1", name: "Alice" },
      lentAt: Date.UTC(2026, 10, 2), items: [{ cardId: "c3", quantity: 1, card: catalogue[2] }],
    },
  ]
})

describe.each(kitCases)("%s kit: me", (_, { MePage }) => {
  test("an agent adds to, recounts and removes from the member's collection", async () => {
    render(<MePage />)
    const result = await agent.act({
      steps: [
        { ref: labels.copiesToOffer, action: "setValue", args: [3] },
        { ref: labels.cardToOffer, action: "setQuery", args: ["scorcher"] },
        { ref: labels.cardToOffer, action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
        { ref: labels.offeredCopies("Pouty Poro · OGN 013"), action: "setValue", args: [4] },
        { ref: labels.withdraw("Pouty Poro · OGN 013"), action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c1", quantity: 3 })
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c2", quantity: 4 })
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c2", quantity: 0 })
    for (const e of agent.snapshot().filter((e) => !e.offPage && e.component !== "more"))
      expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy()
  })

  test("the member sees what they lent and what they borrowed", () => {
    render(<MePage />)
    expect(screen.getByRole("table", { name: labels.lentByMe }).textContent).toContain("Uncle Joe")
    expect(screen.getByRole("table", { name: labels.borrowedByMe }).textContent).toContain("Bob")
  })

  test("signed out, the page only offers sign-in", () => {
    session.me = null
    render(<MePage />)
    expect(screen.getByRole("button", { name: labels.signIn })).toBeTruthy()
    expect(screen.queryByRole("table")).toBeNull()
  })
})
