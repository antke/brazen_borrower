import { expect, test } from "vitest"
import { assertCanLend, assertCanSetCopies, assertQuantity, freeCopies, lentOut, poolTopUp, splitReturn, toCard } from "./cards"

test("toCard keeps the printed number's letter suffix and upper-cases the set", () => {
  expect(
    toCard({
      printing_id: "uuid-1",
      riftboundId: "ogn-007a-298",
      name: "Fury Rune (Alternate Art)",
      set: "ogn",
      rarity: "Common",
      imgUrl: "https://example.test/a.png",
    })
  ).toEqual({
    printingId: "uuid-1",
    name: "Fury Rune (Alternate Art)",
    set: "OGN",
    number: "007a",
    rarity: "Common",
    imageUrl: "https://example.test/a.png",
  })
})

test("lentOut counts only unreturned loans from members, per lender and card", () => {
  const out = lentOut([
    { lender: { userId: "alice" }, items: [{ cardId: "x", quantity: 2 }, { cardId: "y", quantity: 1 }] },
    { lender: { userId: "alice" }, items: [{ cardId: "x", quantity: 1 }] },
    { lender: { userId: "bob" }, items: [{ cardId: "x", quantity: 3 }] },
    { lender: { userId: "alice" }, items: [{ cardId: "x", quantity: 5 }], returnedAt: 1 },
    { lender: {}, items: [{ cardId: "x", quantity: 4 }] },
  ])
  expect(out.get("alice:x")).toBe(3)
  expect(out.get("alice:y")).toBe(1)
  expect(out.get("bob:x")).toBe(3)
})

test("poolTopUp adds a card that isn't in your collection, and never raises one that is", () => {
  expect(poolTopUp({ cardId: "x", quantity: 2 }, { lent: 0 })).toEqual({ from: 0, to: 2 })
  expect(poolTopUp({ cardId: "x", quantity: 2 }, { offered: 3, lent: 0 })).toBeNull()
  expect(poolTopUp({ cardId: "x", quantity: 2 }, { offered: 3, lent: 2 })).toBeNull()
})

test("you lend only free copies of a card in your collection; a card that isn't there has no limit here", () => {
  expect(freeCopies({ offered: 3, lent: 2 })).toBe(1)
  expect(freeCopies({ lent: 0 })).toBeUndefined()
  expect(() => assertCanLend({ quantity: 1 }, { offered: 3, lent: 2 }, "Poro")).not.toThrow()
  expect(() => assertCanLend({ quantity: 2 }, { offered: 3, lent: 2 }, "Poro")).toThrow("Only 1 of your copies of Poro are free")
  expect(() => assertCanLend({ quantity: 1 }, { offered: 2, lent: 2 }, "Poro")).toThrow("Every copy of Poro in your collection is lent out")
  expect(() => assertCanLend({ quantity: 9 }, { lent: 0 }, "Poro")).not.toThrow()
})

test("your collection can't go below the copies lent out", () => {
  expect(() => assertCanSetCopies(2, 2, "Poro")).not.toThrow()
  expect(() => assertCanSetCopies(1, 2, "Poro")).toThrow("2 copies of Poro are lent out; mark them returned before going below 2")
  expect(() => assertCanSetCopies(0, 1, "Poro")).toThrow("1 copy of Poro is lent out; mark it returned")
})

test("assertQuantity accepts whole numbers in range only", () => {
  expect(() => assertQuantity(1)).not.toThrow()
  expect(() => assertQuantity(0, 0)).not.toThrow()
  for (const bad of [0, -1, 1.5, 100, Number.NaN]) expect(() => assertQuantity(bad)).toThrow()
})

test("splitReturn moves the copies coming back out of the loan and keeps the rest out", () => {
  const lent = [{ cardId: "a", quantity: 5 }, { cardId: "b", quantity: 2 }]
  expect(splitReturn(lent, [{ cardId: "a", quantity: 3 }])).toEqual({
    returned: [{ cardId: "a", quantity: 3 }],
    stillOut: [{ cardId: "a", quantity: 2 }, { cardId: "b", quantity: 2 }],
  })
  expect(splitReturn(lent, [{ cardId: "a", quantity: 5 }, { cardId: "b", quantity: 2 }]).stillOut).toEqual([])
})

test("splitReturn refuses cards that aren't on the loan and more copies than were lent", () => {
  const lent = [{ cardId: "a", quantity: 2 }]
  expect(() => splitReturn(lent, [{ cardId: "z", quantity: 1 }])).toThrow("isn't on this loan")
  expect(() => splitReturn(lent, [{ cardId: "a", quantity: 3 }])).toThrow("more copies than were lent")
  expect(() => splitReturn(lent, [{ cardId: "a", quantity: 0 }])).toThrow("whole number")
})
