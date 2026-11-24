import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { parseDeckCode } from "@/core/decks"
import { labels } from "@/core/labels"
import { catalogue, members, mutations, queries, session } from "@/test/convex-mock"
import { kitCases } from "./kits"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())
const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("next/link", () => ({ default: ({ href, ...props }: { href: string }) => createElement("a", { href, ...props }) }))

const legend = { ...catalogue[0], _id: "c9", name: "Riven, The Exile", type: "Legend", domains: ["Calm", "Chaos"], tags: ["Riven"] }
const champion = { ...catalogue[1], _id: "c8", name: "Riven, Broken Blade", type: "Unit", supertype: "Champion", domains: ["Chaos"], tags: ["Riven"] }
const yasuo = { ...catalogue[2], _id: "c7", name: "Yasuo, Remorseful", type: "Unit", supertype: "Champion", domains: ["Calm"], tags: ["Yasuo"] }
const unit = { ...catalogue[2], _id: "c6", name: "Calm Unit", type: "Unit", domains: ["Calm"], tags: [] }
const rune = { ...catalogue[2], _id: "c5", name: "Calm Rune", type: "Rune", supertype: "Basic", domains: ["Calm"], tags: [] }

// What a complete deck needs besides the cards above: 12 more names to fill the main deck, and 3 battlefields.
const fillers = Array.from({ length: 12 }, (_, n) => ({ ...unit, _id: `f${n}`, name: `Calm Filler ${n}` }))
const fields = [1, 2, 3].map((n) => ({ ...catalogue[2], _id: `b${n}`, name: `Field ${n}`, type: "Battlefield", domains: ["Colorless"], tags: [] }))
const deckCatalogue = [legend, champion, yasuo, unit, rune, ...fillers, ...fields]
/** A complete Riven deck: 3 Calm Unit and 3 of each filler make the 39. */
const completeList = [
  "Legend:", "1 Riven, The Exile", "", "Champion:", "1 Riven, Broken Blade", "", "MainDeck:", "3 Calm Unit",
  ...fillers.map((f) => `3 ${f.name}`), "", "Battlefields:", ...fields.map((f) => `1 ${f.name}`), "", "Rune Pool:", "12 Calm Rune",
].join("\n")
/** Pastes `list` in through the header's Import list dialog. */
async function importList(user: ReturnType<typeof userEvent.setup>, list: string) {
  await user.click(screen.getByRole("button", { name: labels.importDeck }))
  const dialog = screen.getByRole("dialog", { name: labels.importDeck })
  // The box keeps what was pasted after a failed import; start afresh.
  await user.clear(within(dialog).getByLabelText(labels.deckList))
  await user.paste(list)
  await user.click(within(dialog).getByRole("button", { name: labels.importConfirm }))
}
const importCompleteDeck = (user: ReturnType<typeof userEvent.setup>) => importList(user, completeList)

/** The member's collection: `copies` free of each card, unless given per card id as [free, lent]. */
const collection = (copies: number, some: Record<string, [number, number]> = {}) =>
  deckCatalogue.map((card) => {
    const [available, lent] = some[card._id] ?? [copies, 0]
    return { _id: `p${card._id}`, ownerId: "u1", owner: "Ana", cardId: card._id, card, quantity: available + lent, lent, available }
  })

beforeEach(() => {
  for (const fn of Object.values(mutations)) fn.mockClear()
  push.mockClear()
  session.me = members[0]
  queries["catalog:list"] = deckCatalogue
  // Enough of everything that every copy starts available; tests about the collection set their own.
  queries["pool:mine"] = collection(12)
})
afterEach(() => {
  queries["catalog:list"] = catalogue
  queries["decks:mine"] = []
  queries["pool:mine"] = []
})

describe.each(kitCases)("%s kit: decks", (_, { DecksPage, DeckBuilderPage }) => {
  test("the decks page lists the member's decks, named by legend and champion until named, and exports them as text", async () => {
    queries["decks:mine"] = [
      {
        _id: "d1", ownerId: "u1", name: "", updatedAt: Date.UTC(2026, 10, 3),
        cards: [
          { cardId: "c9", quantity: 1, zone: "legend", status: "available", card: legend },
          { cardId: "c8", quantity: 1, zone: "champion", status: "posted", card: champion },
        ],
      },
    ]
    const user = userEvent.setup()
    render(<DecksPage />)
    const table = screen.getByRole("table", { name: labels.myDecks })
    const title = "Riven, The Exile + Riven, Broken Blade"
    expect(table.textContent).toContain(title)
    expect(within(table).getByText("Posted 1")).toBeTruthy()
    // Saved with only a legend and champion: it's in the list, marked invalid, with why on hover.
    expect(within(table).getByText(labels.invalidDeck).getAttribute("title")).toContain("Main deck: 0 of 39")
    expect(screen.getByRole("link", { name: labels.editDeck(title) }).getAttribute("href")).toBe("/decks/d1")
    await user.click(screen.getByRole("button", { name: labels.exportDeck(title) }))
    expect((screen.getByRole("textbox", { name: labels.deckList }) as HTMLTextAreaElement).value).toBe(
      "Legend:\n1 Riven, The Exile\n\nChampion:\n1 Riven, Broken Blade\n"
    )
    await user.click(screen.getByRole("tab", { name: "Buy list" }))
    expect((screen.getByRole("textbox", { name: "Buy list" }) as HTMLTextAreaElement).value).toBe("1 Riven, Broken Blade\n1 Riven, The Exile\n")
    await user.click(screen.getByRole("tab", { name: "Deck code" }))
    const code = (screen.getByRole("textbox", { name: "Deck code" }) as HTMLTextAreaElement).value
    expect(parseDeckCode(code)).toEqual([
      { name: `${legend.set}-${legend.number}`, quantity: 1 },
      { name: `${champion.set}-${champion.number}`, quantity: 1, zone: "champion" },
    ])
  })

  test("a deck is built step by step: a legend, then only its champions and colours, then saved with each card's status", async () => {
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Riven, The Exile", "legend") }))
    await user.click(screen.getByRole("tab", { name: "Champions" }))
    expect(screen.queryByRole("button", { name: labels.addToDeck("Yasuo, Remorseful", "chosen champion") })).toBeNull()
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Riven, Broken Blade", "chosen champion") }))
    // Riven is Calm and Chaos, so only those colours are left to filter by.
    expect(screen.getAllByRole("button", { name: /^Only .* cards$/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      labels.filterColour("Calm"),
      labels.filterColour("Chaos"),
    ])
    // An unfinished deck still saves; the warning counts what each zone still needs.
    expect(screen.getByRole("button", { name: labels.saveDeck }).hasAttribute("disabled")).toBe(false)
    expect(screen.getByText(labels.invalidDeckTitle)).toBeTruthy()
    expect(screen.getByText("Main deck", { selector: "strong" }).parentElement?.textContent).toContain("Main deck: 0 of 39. Runes: 0 of 12. Battlefields: 0 of 3.")

    await importCompleteDeck(user)
    expect(screen.queryByText(labels.invalidDeckTitle)).toBeNull()
    await user.click(screen.getByRole("button", { name: labels.deckCard("Riven, Broken Blade", "chosen champion") }))
    await user.click(screen.getByRole("combobox", { name: labels.cardStatus }))
    await user.click(screen.getByRole("option", { name: "Posted" }))
    await user.click(screen.getByRole("button", { name: "Done" }))
    await user.type(screen.getByLabelText(labels.deckName), "Exile")
    await user.click(screen.getByRole("button", { name: labels.saveDeck }))
    // A posted copy isn't available, so the save stops to show it first; only the champion needs a look.
    const review = screen.getByRole("dialog", { name: labels.reviewSaveTitle })
    expect(within(within(review).getByRole("list", { name: labels.cardsToReview })).getAllByRole("listitem")).toHaveLength(1)
    expect(within(review).getByText(/Chosen champion · yours: 12 free, 0 lent/)).toBeTruthy()
    expect(mutations["decks:save"]).not.toHaveBeenCalled()
    await user.click(within(review).getByRole("button", { name: labels.saveDeck }))
    const saved = mutations["decks:save"].mock.calls[0][0]
    expect(saved).toMatchObject({ id: undefined, name: "Exile" })
    expect(saved.cards).toContainEqual({ cardId: "c9", quantity: 1, zone: "legend", status: "available" })
    expect(saved.cards).toContainEqual({ cardId: "c8", quantity: 1, zone: "champion", status: "posted" })
    expect(push).toHaveBeenCalledWith("/decks")
  })

  test("statuses come from the collection: an import shows what's lent or missing, and saving checks it again", async () => {
    // Calm Unit: 1 free and 1 lent, for the 3 the list wants. Everything else: plenty.
    queries["pool:mine"] = collection(12, { c6: [1, 1] })
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await importCompleteDeck(user)
    const review = screen.getByRole("dialog", { name: labels.reviewImportTitle })
    expect(within(review).getByText("Calm Unit")).toBeTruthy()
    expect(within(review).getByText(/Main deck · yours: 1 free, 1 lent/)).toBeTruthy()
    const chips = within(review).getByRole("group", { name: labels.cardStatuses("Calm Unit") })
    // 1 available, 1 lent, 1 not in collection: each chip says how many.
    expect(within(chips).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Lent", 1) })).toBeTruthy()
    expect(within(chips).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Not in collection", 1) })).toBeTruthy()
    // The chips are icons and counts; resting on one names it within a moment.
    await user.hover(within(chips).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Posted", 0) }))
    expect(await screen.findByText("Posted: 0. Click to add one", {}, { timeout: 400 })).toBeTruthy()
    // The missing one is really in the post: a click on Posted moves it over, keeping the card's 3 copies.
    await user.click(within(chips).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Posted", 0) }))
    expect(within(chips).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Not in collection", 0) })).toBeTruthy()
    // A − sends a copy back to not in collection, and a click brings it back.
    await user.click(within(chips).getByRole("button", { name: labels.oneFewerAs("Calm Unit", "Posted") }))
    expect(within(chips).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Not in collection", 1) })).toBeTruthy()
    await user.click(within(chips).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Posted", 0) }))
    await user.click(within(review).getByRole("button", { name: labels.reviewDone }))
    const stamp = screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })
    for (const tag of ["1 available", "1 posted", "1 lent"]) expect(within(stamp).getByTitle(tag)).toBeTruthy()

    // Saving checks again, as the card still isn't all available.
    await user.type(screen.getByLabelText(labels.deckName), "Lent")
    await user.click(screen.getByRole("button", { name: labels.saveDeck }))
    await user.click(within(screen.getByRole("dialog", { name: labels.reviewSaveTitle })).getByRole("button", { name: labels.saveDeck }))
    const { cards } = mutations["decks:save"].mock.calls[0][0]
    expect(cards.filter((c: { cardId: string }) => c.cardId === "c6")).toEqual([
      { cardId: "c6", quantity: 1, zone: "main", status: "available" },
      { cardId: "c6", quantity: 1, zone: "main", status: "posted" },
      { cardId: "c6", quantity: 1, zone: "main", status: "lent" },
    ])
  })

  test("the Import list dialog closes on a clean import, says which cards a partial one left out, and changes nothing on a failed one", async () => {
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    // The steps are just the five browse tabs now.
    expect(screen.queryByRole("tab", { name: "Import" })).toBeNull()

    await importList(user, "Nothing to see")
    expect(within(screen.getByRole("dialog", { name: labels.importDeck })).getByText(/lines look like/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Cancel" }))

    await importList(user, "MainDeck:\n2 Calm Unit\n1 No Such Card")
    const dialog = screen.getByRole("dialog", { name: labels.importDeck })
    expect(within(dialog).getByText("Imported. Not found, so left out: No Such Card.")).toBeTruthy()
    expect(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") }).textContent).toContain("2x")
    await user.click(within(dialog).getByRole("button", { name: "Done" }))
    expect(screen.queryByRole("dialog", { name: labels.importDeck })).toBeNull()

    await importCompleteDeck(user)
    expect(screen.queryByRole("dialog", { name: labels.importDeck })).toBeNull()
    expect(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") }).textContent).toContain("3x")
  })

  test("adding copies past the collection marks them lent, then not in collection", async () => {
    queries["pool:mine"] = collection(12, { c6: [1, 1] })
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") }))
    const stamp = screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })
    for (const tag of ["1 available", "1 lent", "1 not in collection"]) expect(within(stamp).getByTitle(tag)).toBeTruthy()
  })

  test("a deck card reacts when a copy goes in or out, not just its count", async () => {
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    const add = screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") })
    await user.click(add)
    await user.click(add)
    const stamp = () => screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })
    const frame = () => stamp().closest("[data-stamp-frame]")!
    expect(frame().getAttribute("data-bump")).toBe("up")
    // The browse tile it came from reacts too.
    expect(add.closest("[data-card-tile]")!.getAttribute("data-bump")).toBe("up")
    await user.click(stamp())
    expect(stamp().textContent).toContain("1x")
    expect(frame().getAttribute("data-bump")).toBe("down")
  })

  test("a card's printings show as one tile; its dialog picks the printing, and the art follows", async () => {
    const alt = { ...unit, _id: "c4", name: "Calm Unit (Alternate Art)", number: "006a", imageUrl: "https://example.com/alt.png" }
    queries["catalog:list"] = [...deckCatalogue, alt]
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    expect(screen.queryByRole("button", { name: labels.addToDeck("Calm Unit (Alternate Art)", "main deck") })).toBeNull()
    expect(screen.getByTitle("2 printings")).toBeTruthy()
    await importCompleteDeck(user)
    // One copy out (the deck's 3 Calm Units become 2), to add back once the printing has changed.
    await user.click(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") }))
    await user.click(screen.getByRole("button", { name: labels.deckCard("Calm Unit", "main deck") }))
    await user.click(screen.getByRole("combobox", { name: labels.cardPrinting }))
    await user.click(screen.getByRole("option", { name: /Alternate Art/ }))
    // The dialog stays open on the new printing, its art swapped.
    expect(screen.getByRole("heading", { name: "Calm Unit (Alternate Art)" })).toBeTruthy()
    expect(screen.getByRole("dialog").querySelector("img")?.getAttribute("src")).toContain("alt.png")
    await user.click(screen.getByRole("button", { name: "Done" }))
    // Another copy of the card joins the printing already in the deck.
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") }))
    await user.type(screen.getByLabelText(labels.deckName), "Alt")
    await user.click(screen.getByRole("button", { name: labels.saveDeck }))
    const { cards } = mutations["decks:save"].mock.calls[0][0]
    expect(cards).toContainEqual({ cardId: "c4", quantity: 3, zone: "main", status: "available" })
    expect(cards.some((c: { cardId: string }) => c.cardId === "c6")).toBe(false)
  })

  test("a card in hand in any printing, or borrowed, counts as the member's when browsing", async () => {
    const alt = { ...unit, _id: "c4", name: "Calm Unit (Alternate Art)", number: "006a" }
    queries["catalog:list"] = [...deckCatalogue, alt]
    const row = (card: typeof unit, available: number) => ({ _id: `p${card._id}`, ownerId: "u1", owner: "Ana", cardId: card._id, card, quantity: available, lent: 0, available })
    queries["pool:mine"] = [row(unit, 1), row(alt, 1)]
    queries["loans:mine"] = [
      { _id: "l9", lender: { userId: "u2", name: "Bob" }, borrower: { userId: "u1", name: "Alice" }, lentAt: 0, items: [{ cardId: "f0", quantity: 1, card: fillers[0] }] },
    ]
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    await user.click(screen.getByRole("button", { name: labels.ownedOnly }))
    const tiles = [...screen.getByRole("list", { name: labels.browseDeckCards }).querySelectorAll("li")].map((li) => li.textContent)
    // One copy of each printing makes two of the card; the borrowed filler is in hand too; the other fillers aren't.
    expect(tiles.find((t) => t?.includes("Calm Unit"))).toContain("2 free")
    expect(tiles.find((t) => t?.includes("Calm Filler 0"))).toContain("1 free")
    expect(tiles.some((t) => t?.includes("Calm Filler 1"))).toBe(false)
    queries["loans:mine"] = []
  })

  test("the card dialog moves copies between statuses freely and changes the deck only on Done", async () => {
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    const main = screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") })
    await user.click(main)
    await user.click(main)
    const step = (dir: "Increase" | "Decrease", status: string) =>
      user.click(screen.getByRole("button", { name: `${dir} ${labels.statusCopies(status, "Calm Unit", "main deck")}` }))
    const open = () => user.click(screen.getByRole("button", { name: labels.deckCard("Calm Unit", "main deck") }))
    const stamp = () => screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })

    // Both available copies go to posted, one step at a time, with the available count reaching 0 on the way.
    await open()
    await step("Decrease", "Available")
    await step("Increase", "Posted")
    await step("Decrease", "Available")
    await step("Increase", "Posted")
    expect(screen.getByRole("dialog")).toBeTruthy()
    // Nothing in the deck changes until Done.
    expect(within(stamp()).getByTitle("Available")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Done" }))
    expect(within(stamp()).getByTitle("Posted")).toBeTruthy()
    expect(stamp().textContent).toContain("2x")

    // Closing without Done keeps the deck as it was.
    await open()
    await step("Decrease", "Posted")
    await user.click(screen.getByRole("button", { name: "Close" }))
    expect(stamp().textContent).toContain("2x")
  })

  test("viewing a deck shows it whole and changes only statuses, saving each change", async () => {
    queries["decks:mine"] = [
      {
        _id: "d1", ownerId: "u1", name: "Exile", updatedAt: Date.UTC(2026, 10, 3),
        cards: [
          { cardId: "c9", quantity: 1, zone: "legend", status: "available", card: legend },
          { cardId: "c6", quantity: 2, zone: "main", status: "posted", card: unit },
          { cardId: "c5", quantity: 12, zone: "rune", status: "available", card: rune },
        ],
      },
    ]
    const user = userEvent.setup()
    render(<DecksPage />)
    // A click on the deck's row (its name) opens the viewer, as its View button does.
    await user.click(within(screen.getByRole("table", { name: labels.myDecks })).getByText("Exile"))
    expect(screen.getByRole("dialog", { name: "Exile" })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Close" }))
    await user.click(screen.getByRole("button", { name: labels.viewDeck("Exile") }))
    const viewer = screen.getByRole("dialog", { name: "Exile" })
    // The builder's filters and views, but no way to take a card out.
    expect(within(viewer).getByRole("button", { name: labels.deckAsList })).toBeTruthy()
    expect(within(viewer).queryByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })).toBeNull()
    // Export sits beside Edit, as on the deck's row.
    expect(within(viewer).getByRole("button", { name: labels.exportDeck("Exile") })).toBeTruthy()

    // One posted copy arrives: its chips move it to available, keeping the 2 copies, and Done saves.
    await user.click(within(viewer).getByRole("button", { name: labels.deckCard("Calm Unit", "main deck") }))
    const card = screen.getByRole("dialog", { name: "Calm Unit" })
    expect(within(card).queryByRole("button", { name: /Remove/ })).toBeNull()
    // + moves a copy in (from posted), − sends it to not in collection, and + brings that one back.
    await user.click(within(card).getByRole("button", { name: labels.plusOneAs("Calm Unit", "Available") }))
    await user.click(within(card).getByRole("button", { name: labels.oneFewerAs("Calm Unit", "Available") }))
    expect(within(card).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Not in collection", 1) })).toBeTruthy()
    await user.click(within(card).getByRole("button", { name: labels.plusOneAs("Calm Unit", "Available") }))
    expect(within(card).getByRole("button", { name: labels.oneMoreAs("Calm Unit", "Posted", 1) })).toBeTruthy()
    await user.click(within(card).getByRole("button", { name: "Done" }))
    expect(mutations["decks:save"].mock.calls[0][0]).toMatchObject({ id: "d1", name: "Exile" })
    const saved = mutations["decks:save"].mock.calls[0][0].cards
    expect(saved).toContainEqual({ cardId: "c6", quantity: 1, zone: "main", status: "available" })
    expect(saved).toContainEqual({ cardId: "c6", quantity: 1, zone: "main", status: "posted" })
    expect(saved).toHaveLength(4)

    // Picking cards sets one status for them all, with no copies to change and no delete.
    await user.click(within(viewer).getByRole("button", { name: labels.selectCards }))
    const panel = within(viewer).getByRole("group", { name: labels.selection })
    expect(within(panel).queryByRole("button", { name: labels.deletePicked })).toBeNull()
    await user.click(within(viewer).getByRole("button", { name: labels.pickDeckCard("Calm Unit", "main deck") }))
    await user.click(within(panel).getByRole("button", { name: labels.setPickedStatus }))
    const picked = screen.getByRole("dialog", { name: labels.setPickedStatusTitle("1 card") })
    expect(within(picked).queryByRole("button", { name: `Decrease ${labels.deckCopies("Calm Unit", "main deck")}` })).toBeNull()
    expect(within(picked).getByRole("button", { name: labels.savePicked }).hasAttribute("disabled")).toBe(true)
    await user.click(within(picked).getByRole("button", { name: "Available" }))
    await user.click(within(picked).getByRole("button", { name: labels.savePicked }))
    expect(mutations["decks:save"].mock.calls[1][0].cards).toContainEqual({ cardId: "c6", quantity: 2, zone: "main", status: "available" })
  })

  test("picking several cards edits their copies and status at once, or deletes them", async () => {
    const spell = { ...unit, _id: "c3", name: "Calm Spell", type: "Spell" }
    queries["catalog:list"] = [legend, champion, unit, spell, rune]
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Spell", "main deck") }))
    await user.click(screen.getByRole("tab", { name: "Runes" }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Rune", "runes") }))

    await user.click(screen.getByRole("button", { name: labels.selectCards }))
    const panel = screen.getByRole("group", { name: labels.selection })
    expect(within(panel).getByRole("button", { name: labels.editPicked }).hasAttribute("disabled")).toBe(true)
    // Picking a card checks it and leaves it in the deck; its edit button is gone while picking.
    const pick = (card: string, zone: string) => user.click(screen.getByRole("button", { name: labels.pickDeckCard(card, zone) }))
    await pick("Calm Unit", "main deck")
    await pick("Calm Spell", "main deck")
    await pick("Calm Rune", "runes")
    await pick("Calm Rune", "runes")
    expect(screen.getByRole("button", { name: labels.pickDeckCard("Calm Unit", "main deck") }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.queryByRole("button", { name: labels.deckCard("Calm Unit", "main deck") })).toBeNull()
    expect(within(panel).getByText(labels.pickedCount(2))).toBeTruthy()

    // Edit: 3 Calm Units down to 2, every copy of both not in collection.
    await user.click(within(panel).getByRole("button", { name: labels.editPicked }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("This updates 2 cards in one go.")).toBeTruthy()
    await user.click(within(dialog).getByRole("button", { name: `Decrease ${labels.deckCopies("Calm Unit", "main deck")}` }))
    await user.click(within(dialog).getByRole("button", { name: "Not in collection" }))
    await user.click(within(dialog).getByRole("button", { name: labels.savePicked }))
    expect(screen.queryByRole("dialog")).toBeNull()
    const unit3 = screen.getByRole("button", { name: labels.pickDeckCard("Calm Unit", "main deck") })
    expect(unit3.textContent).toContain("2x")
    expect(within(unit3).getByTitle("Not in collection")).toBeTruthy()
    expect(within(screen.getByRole("button", { name: labels.pickDeckCard("Calm Rune", "runes") })).getByTitle("Available")).toBeTruthy()

    // Delete takes the picked cards out of the deck.
    await pick("Calm Spell", "main deck")
    await user.click(within(panel).getByRole("button", { name: labels.deletePicked }))
    expect(screen.queryByRole("button", { name: labels.pickDeckCard("Calm Spell", "main deck") })).toBeNull()
    expect(screen.getByRole("button", { name: labels.pickDeckCard("Calm Unit", "main deck") })).toBeTruthy()

    // Select again ends picking: its controls go and a click on a card takes a copy out again.
    await pick("Calm Unit", "main deck")
    await user.click(screen.getByRole("button", { name: labels.selectCards }))
    expect(screen.queryByRole("group", { name: labels.selection })).toBeNull()
    expect(screen.getByRole("button", { name: labels.selectCards }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })).toBeTruthy()
    // Starting again starts with nothing picked.
    await user.click(screen.getByRole("button", { name: labels.selectCards }))
    expect(within(screen.getByRole("group", { name: labels.selection })).getByText(labels.pickedCount(0))).toBeTruthy()
  })

  test("grouping by type splits the main deck into units, spells and gear", async () => {
    const spell = { ...unit, _id: "c3", name: "Calm Spell", type: "Spell" }
    queries["catalog:list"] = [legend, champion, unit, spell, rune]
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Spell", "main deck") }))
    expect(screen.queryByRole("list", { name: "Main deck: Units" })).toBeNull()
    await user.click(screen.getByRole("button", { name: labels.groupByType }))
    expect(within(screen.getByRole("list", { name: "Main deck: Units" })).getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })).toBeTruthy()
    expect(within(screen.getByRole("list", { name: "Main deck: Spells" })).getByRole("button", { name: labels.removeOneFromDeck("Calm Spell", "main deck") })).toBeTruthy()
    expect(screen.getByText("Units 2")).toBeTruthy()
    expect(screen.queryByRole("list", { name: "Main deck: Gear" })).toBeNull()
  })

  test("the deck is searched by name and filtered by the legend's colours", async () => {
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Riven, The Exile", "legend") }))
    await user.click(screen.getByRole("tab", { name: "Champions" }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Riven, Broken Blade", "chosen champion") }))
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") }))
    const inDeck = (card: string, zone: string) => screen.queryByRole("button", { name: labels.removeOneFromDeck(card, zone) })
    // Only Riven's colours, Calm and Chaos, are offered.
    expect(screen.queryByRole("button", { name: labels.filterDeckColour("Fury") })).toBeNull()
    await user.click(screen.getByRole("button", { name: labels.filterDeckColour("Chaos") }))
    expect(inDeck("Calm Unit", "main deck")).toBeNull()
    expect(inDeck("Riven, Broken Blade", "chosen champion")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: labels.filterDeckColour("Chaos") }))
    await user.type(screen.getByRole("textbox", { name: labels.searchDeck }), "calm")
    expect(inDeck("Calm Unit", "main deck")).toBeTruthy()
    expect(inDeck("Riven, Broken Blade", "chosen champion")).toBeNull()
    // The search's clear button empties it in one go.
    const deckSearch = screen.getByRole("textbox", { name: labels.searchDeck }).closest("[data-slot]")!.parentElement!
    await user.click(within(deckSearch).getByRole("button", { name: labels.clearSearch }))
    expect((screen.getByRole("textbox", { name: labels.searchDeck }) as HTMLInputElement).value).toBe("")
    expect(inDeck("Riven, Broken Blade", "chosen champion")).toBeTruthy()
  })

  test("clicking a card's art adds it to the main deck once the legend and chosen champion are in", async () => {
    const user = userEvent.setup()
    const { container } = render(<DeckBuilderPage id="new" />)
    const art = (name: string) => container.querySelector(`[data-card-tile]:has([title="${name}"]) [data-tile-art]`) as HTMLElement
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    await user.click(art("Calm Unit"))
    expect(screen.queryByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })).toBeNull()
    await user.click(screen.getByRole("tab", { name: "Legends" }))
    await user.click(art("Riven, The Exile"))
    await user.click(screen.getByRole("tab", { name: "Champions" }))
    await user.click(art("Riven, Broken Blade"))
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    await user.click(art("Calm Unit"))
    await user.click(art("Calm Unit"))
    expect(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") }).textContent).toContain("2x")
  })

  test("a card stops at 3 copies across main deck and sideboard; runes go past 3; clicking a deck card takes one out", async () => {
    const user = userEvent.setup()
    render(<DeckBuilderPage id="new" />)
    await user.click(screen.getByRole("tab", { name: "Cards" }))
    const main = screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "main deck") })
    await user.click(main)
    await user.click(main)
    await user.click(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "sideboard") }))
    expect(main.hasAttribute("disabled")).toBe(true)
    // The browsing tile counts the copies in the deck on its art: 2 in the main deck and 1 in the sideboard.
    expect(screen.getByText("3x")).toBeTruthy()
    expect(screen.getByRole("button", { name: labels.addToDeck("Calm Unit", "sideboard") }).hasAttribute("disabled")).toBe(true)
    // The deck shows each card as a stamp of its art; opening it gives its copies in each status, and removal.
    await user.click(screen.getByRole("button", { name: labels.deckCard("Calm Unit", "main deck") }))
    const statusCopies = (status: string) => `Increase ${labels.statusCopies(status, "Calm Unit", "main deck")}`
    expect(screen.getByRole("button", { name: statusCopies("Available") }).hasAttribute("disabled")).toBe(true)
    // At the cap, one more awaiting postage moves a copy over from available: 1 of each, still 2 in the main deck.
    await user.click(screen.getByRole("button", { name: statusCopies("Awaiting postage") }))
    await user.click(screen.getByRole("button", { name: "Done" }))
    const stamp = screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })
    expect(within(stamp).getByTitle("1 available").textContent).toContain("1")
    expect(within(stamp).getByTitle("1 awaiting postage")).toBeTruthy()
    expect(stamp.textContent).toContain("2x")
    await user.click(screen.getByRole("button", { name: labels.filterStatus("Awaiting postage") }))
    expect(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Unit", "main deck") })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: labels.filterStatus("Awaiting postage") }))

    await user.click(screen.getByRole("tab", { name: "Runes" }))
    const addRune = screen.getByRole("button", { name: labels.addToDeck("Calm Rune", "runes") })
    for (let i = 0; i < 4; i++) await user.click(addRune)
    expect(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Rune", "runes") }).textContent).toContain("4x")
    // The list view shows the same card as a line, with its count, status and the same menu.
    await user.click(screen.getByRole("button", { name: labels.deckAsList }))
    const runes = screen.getByRole("list", { name: "Legend, chosen champion and runes" })
    expect(runes.textContent).toContain("Calm Rune")
    expect(runes.textContent).toContain("4x")
    expect(within(runes).getByRole("button", { name: labels.deckCard("Calm Rune", "runes") })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: labels.deckAsGrid }))
    // A click on a card in the deck takes one copy out; the last click takes the card out.
    await user.click(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Rune", "runes") }))
    expect(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Rune", "runes") }).textContent).toContain("3x")
    // Each deck card carries its status; the status filters narrow the cards shown.
    expect(within(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Rune", "runes") })).getByTitle("Available")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: labels.filterStatus("Lent") }))
    expect(screen.queryByRole("button", { name: labels.removeOneFromDeck("Calm Rune", "runes") })).toBeNull()
    await user.click(screen.getByRole("button", { name: labels.filterStatus("Lent") }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: labels.removeOneFromDeck("Calm Rune", "runes") }))
    expect(screen.queryByRole("button", { name: labels.removeOneFromDeck("Calm Rune", "runes") })).toBeNull()
  })
})
