import { fireEvent, render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { cardLabel } from "@/core/cards"
import { labels } from "@/core/labels"
import { onNotice } from "@/core/notices"
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
  test("an agent adds to and recounts the member's collection, and a card with copies lent out can't be removed", async () => {
    const heard = vi.fn()
    const stop = onNotice(heard)
    render(<MePage />)
    // Adding cards happens in a dialog, which stays open after each card.
    fireEvent.click(screen.getByRole("button", { name: labels.addCards }))
    const result = await agent.act({
      steps: [
        { ref: labels.copiesToOffer, action: "setValue", args: [3] },
        { ref: labels.cardToOffer, action: "setQuery", args: ["scorcher"] },
        { ref: labels.cardToOffer, action: "setValue", args: ["Blazing Scorcher · OGN 001"] },
        { ref: labels.offeredCopies("Pouty Poro · OGN 013"), action: "setValue", args: [4] },

      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c1", quantity: 3 })
    // Still open for the next card, listing what was added.
    expect(screen.getByRole("dialog", { name: labels.addCardsDialog })).toBeTruthy()
    expect(screen.getByRole("list", { name: labels.addedCards }).textContent).toContain("Blazing Scorcher")
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c2", quantity: 4 })
    // Each change is said back: a new card by name with its copies, a recount with the new number.
    expect(heard).toHaveBeenCalledWith({ title: labels.addedToCollection(`${catalogue[0].name} ×3`) })
    expect(heard).toHaveBeenCalledWith({ title: labels.copiesInCollection(catalogue[1].name, 4) })
    stop()
    // One Pouty Poro is lent out, so it can't be removed until it comes back.
    expect(screen.getByRole("button", { name: labels.withdraw("Pouty Poro · OGN 013") }).hasAttribute("disabled")).toBe(true)
    expect(mutations["pool:set"]).not.toHaveBeenCalledWith({ cardId: "c2", quantity: 0 })
    for (const e of agent.snapshot().filter((e) => !e.offPage && e.component !== "more"))
      expect(e.label, `${e.component} ${e.ref} has no name`).toBeTruthy()
  })

  test("the collection tabs narrow it to cards lent out or borrowed", async () => {
    render(<MePage />)
    const table = () => screen.getByRole("table", { name: labels.myOffers }).textContent
    // All: the member's own Pouty Poro and the card borrowed from Bob.
    expect(table()).toContain("Pouty Poro")
    expect(table()).toContain(catalogue[2].name)
    // Each tab counts its cards: two in all, one lent, one borrowed.
    expect(screen.getByRole("tab", { name: /^All/ }).textContent).toContain("2")
    fireEvent.click(screen.getByRole("tab", { name: /^Cards lent/ }))
    expect(table()).toContain("Pouty Poro")
    expect(table()).not.toContain(catalogue[2].name)
    fireEvent.click(screen.getByRole("tab", { name: /^Cards borrowed/ }))
    expect(table()).toContain(catalogue[2].name)
    expect(table()).not.toContain("Pouty Poro")
    // The filter narrows whichever tab is open.
    fireEvent.click(screen.getByRole("tab", { name: /^All/ }))
    const result = await agent.act({ steps: [{ ref: labels.filterCollection, action: "setValue", args: ["poro"] }] })
    expect(result.ok, result.error?.message).toBe(true)
    expect(table()).toContain("Pouty Poro")
    expect(table()).not.toContain(catalogue[2].name)
    // A borrowed card isn't the member's to remove.
    expect(screen.queryByRole("button", { name: labels.withdraw(cardLabel(catalogue[2])) })).toBeNull()
  })

  test("the collection filters by card type and rune", async () => {
    queries["pool:mine"] = [
      { _id: "e1", ownerId: "u1", cardId: "c1", quantity: 1, owner: "Alice", card: { ...catalogue[0], type: "Spell", domains: ["Fury"] }, lent: 0, available: 1 },
      { _id: "e2", ownerId: "u1", cardId: "c2", quantity: 1, owner: "Alice", card: { ...catalogue[1], type: "Unit", domains: ["Calm"] }, lent: 0, available: 1 },
    ]
    queries["loans:mine"] = []
    render(<MePage />)
    const table = () => screen.getByRole("table", { name: labels.myOffers }).textContent
    fireEvent.click(screen.getByRole("button", { name: labels.filterColour("Calm") }))
    expect(table()).toContain("Pouty Poro")
    expect(table()).not.toContain("Blazing Scorcher")
    fireEvent.click(screen.getByRole("button", { name: labels.filterColour("Calm") }))
    const result = await agent.act({ steps: [{ ref: labels.filterType, action: "setValue", args: ["Spell"] }] })
    expect(result.ok, result.error?.message).toBe(true)
    expect(table()).toContain("Blazing Scorcher")
    expect(table()).not.toContain("Pouty Poro")
  })

  test("adding a card the member already has adds to its copies", async () => {
    render(<MePage />)
    fireEvent.click(screen.getByRole("button", { name: labels.addCards }))
    const result = await agent.act({
      steps: [
        { ref: labels.cardToOffer, action: "setQuery", args: ["poro"] },
        { ref: labels.cardToOffer, action: "setValue", args: ["Pouty Poro · OGN 013"] },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    // Two already, one more.
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c2", quantity: 3 })
    expect(screen.getByRole("list", { name: labels.addedCards }).textContent).toContain("+1")
  })

  test("the collection sorts by name, then by a column the member picks", () => {
    render(<MePage />)
    const order = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => (row.textContent?.includes("Pouty Poro") ? "poro" : "rune"))
    // By name at first: Fury Rune (borrowed) before Pouty Poro.
    expect(order()).toEqual(["rune", "poro"])
    fireEvent.click(screen.getByRole("button", { name: "Copies" }))
    expect(order()).toEqual(["rune", "poro"])
    fireEvent.click(screen.getByRole("button", { name: "Copies" }))
    expect(order()).toEqual(["poro", "rune"])
    expect(screen.getByRole("columnheader", { name: "Copies" }).getAttribute("aria-sort")).toBe("descending")
  })

  test("the collection shows as a grid of cards, ordered by the sort picker too", async () => {
    render(<MePage />)
    fireEvent.click(screen.getByRole("button", { name: labels.deckAsGrid }))
    expect(screen.queryByRole("table", { name: labels.myOffers })).toBeNull()
    const tiles = () => [...screen.getByRole("list", { name: labels.myOffers }).querySelectorAll("li")].map((li) => li.textContent)
    // By name: the borrowed Fury Rune, then Pouty Poro with its copies stepper and remove button.
    expect(tiles()[0]).toContain("Fury Rune")
    expect(tiles()[1]).toContain("Pouty Poro")
    expect(screen.getByRole("button", { name: labels.withdraw("Pouty Poro · OGN 013") })).toBeTruthy()
    const result = await agent.act({ steps: [{ ref: labels.sortCollection, action: "setValue", args: ["copies"] }] })
    expect(result.ok, result.error?.message).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: labels.reverseSort }))
    expect(tiles()[0]).toContain("Pouty Poro")
  })

  test("a pasted list adds every card in it, on top of the copies already there", async () => {
    render(<MePage />)
    fireEvent.click(screen.getByRole("button", { name: labels.addCards }))
    fireEvent.click(screen.getByRole("button", { name: labels.addList }))
    const result = await agent.act({ steps: [{ ref: labels.cardList, action: "setValue", args: ["1 Pouty Poro\n2 Blazing Scorcher\n1 Nobody Known"] }] })
    expect(result.ok, result.error?.message).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: labels.addListConfirm }))
    await screen.findByText(/Not found, so left out: Nobody Known/)
    // Two Pouty Poros already, one more; the Scorcher is new.
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c2", quantity: 3 })
    expect(mutations["pool:set"]).toHaveBeenCalledWith({ cardId: "c1", quantity: 2 })
    const added = screen.getByRole("list", { name: labels.addedCards }).textContent
    expect(added).toContain("Pouty Poro")
    expect(added).toContain("Blazing Scorcher")
  })

  test("signed out, the page only offers sign-in", () => {
    session.me = null
    render(<MePage />)
    expect(screen.getByRole("button", { name: labels.signIn })).toBeTruthy()
    expect(screen.queryByRole("table")).toBeNull()
  })
})
