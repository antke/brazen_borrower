import { expect, test } from "vitest"
import type { Card } from "./cards"
import { cardFinder, cardsToReview, copiesOf, holdingsByName, nextStatus, resizeCopies, shiftCopy, statusesFromCollection, readCardList, type DeckStatus, type DeckZone } from "./decks"

const copies = (available: number, posted = 0, missing = 0) => ({ available, borrowed: 0, posted, awaiting: 0, lent: 0, missing })

test("resizing a card's copies takes the last statuses first, adds to its first, and can set one status for all", () => {
  expect(resizeCopies(copies(2, 0, 1), 2)).toEqual(copies(2))
  expect(resizeCopies(copies(1, 2), 1)).toEqual(copies(1))
  expect(resizeCopies(copies(0, 1), 3)).toEqual(copies(0, 3))
  expect(resizeCopies(copies(0, 0, 0), 1)).toEqual(copies(1))
  expect(resizeCopies(copies(2, 1), 2, "missing")).toEqual(copies(0, 0, 2))
  expect(copiesOf([{ quantity: 2, status: "posted" }])).toEqual(copies(0, 2))
})

const xyz = { _id: "x", name: "XYZ", set: "OGN", number: "001", imageUrl: "" } as unknown as Card
const line = (quantity: number, status: DeckStatus, zone: DeckZone = "main") => ({ card: xyz, quantity, zone, status })

test("a new copy is available while free copies last, then lent while lent ones do, then not in collection", () => {
  // 1. Two free, none lent: 2 available, the 3rd not in collection.
  expect(nextStatus(xyz, [], { free: 2, borrowed: 0, lent: 0 })).toBe("available")
  expect(nextStatus(xyz, [line(2, "available")], { free: 2, borrowed: 0, lent: 0 })).toBe("missing")
  // 2. One free, one lent: 1 available, 1 lent, the 3rd not in collection.
  expect(nextStatus(xyz, [line(1, "available")], { free: 1, borrowed: 0, lent: 1 })).toBe("lent")
  expect(nextStatus(xyz, [line(1, "available"), line(1, "lent")], { free: 1, borrowed: 0, lent: 1 })).toBe("missing")
  // Copies across zones share the collection; posted and awaiting ones don't use it.
  expect(nextStatus(xyz, [line(1, "available", "side"), line(1, "posted")], { free: 2, borrowed: 0, lent: 0 })).toBe("available")
  // Borrowed copies come after the member's own free ones and before any lent out.
  expect(nextStatus(xyz, [line(1, "available")], { free: 1, borrowed: 1, lent: 1 })).toBe("borrowed")
  expect(nextStatus(xyz, [line(1, "available"), line(1, "borrowed")], { free: 1, borrowed: 1, lent: 1 })).toBe("lent")
  // Every printing of a card is the same card.
  expect(nextStatus({ name: "XYZ (Alternate Art)" }, [line(2, "available")], { free: 2, borrowed: 0, lent: 0 })).toBe("missing")
})

test("an imported list takes its statuses from the collection, and a save reviews what isn't plainly available", () => {
  const holdings = holdingsByName([
    { card: xyz, available: 1, lent: 0 },
    { card: { name: "XYZ (Alternate Art)" }, available: 0, lent: 1 },
  ])
  expect(holdings.get("XYZ")).toEqual({ free: 1, borrowed: 0, lent: 1 })
  const imported = statusesFromCollection([{ card: xyz, quantity: 2, zone: "main" as const }, { card: xyz, quantity: 1, zone: "side" as const }], holdings)
  expect(imported.map((l) => [l.zone, l.status, l.quantity])).toEqual([
    ["main", "available", 1],
    ["main", "lent", 1],
    ["side", "missing", 1],
  ])
  // Fully available within the collection: nothing to review.
  expect(cardsToReview([line(1, "available")], holdings)).toEqual([])
  // Borrowed copies are in hand too, as long as there are that many borrowed.
  const borrowing = holdingsByName([{ card: xyz, available: 1, lent: 0 }], [{ card: xyz, quantity: 1 }])
  expect(borrowing.get("XYZ")).toEqual({ free: 1, borrowed: 1, lent: 0 })
  expect(cardsToReview([line(1, "available"), line(1, "borrowed")], borrowing)).toEqual([])
  expect(cardsToReview([line(1, "available"), line(2, "borrowed")], borrowing)).toHaveLength(1)
  // A copy that isn't available, or more marked available than are free, is reviewed (as its card in one zone).
  expect(cardsToReview(imported, holdings).map((group) => group[0].zone)).toEqual(["main", "side"])
  expect(cardsToReview([line(2, "available")], holdings)).toHaveLength(1)
})

test("shifting a copy keeps the count: in from not in collection first, out back to it", () => {
  const start = copies(1, 0, 2)
  expect(shiftCopy(start, "posted", 1)).toEqual(copies(1, 1, 1))
  expect(shiftCopy(copies(1, 1, 0), "available", 1)).toEqual(copies(2, 0, 0))
  expect(shiftCopy(copies(1, 1, 0), "posted", -1)).toEqual(copies(1, 0, 1))
  // Nothing to move: the copies stay as they are.
  expect(shiftCopy(copies(2, 0, 0), "available", 1)).toEqual(copies(2, 0, 0))
  expect(shiftCopy(start, "posted", -1)).toEqual(start)
  expect(shiftCopy(start, "missing", -1)).toEqual(start)
})

test("a pasted card list reads into cards and copies, summing repeats and naming what it can't find", () => {
  const card = (id: string, name: string, number: string) => ({ _id: id, name, set: "OGN", number }) as unknown as Card
  const find = cardFinder([card("a", "Akali, Brash", "001"), card("b", "Akali, Brash (Alternate Art)", "001a"), card("p", "Pouty Poro", "013")])
  const { items, unknown } = readCardList("1 Akali, Brash\n\n2x pouty poro\n1 Pouty Poro\n3 Nobody Known", find)
  expect(items.map((i) => [i.card._id, i.quantity])).toEqual([["a", 1], ["p", 3]])
  expect(unknown).toEqual(["Nobody Known"])
  expect(() => readCardList("Akali, Brash", find)).toThrow(/3 Card Name/)
})
