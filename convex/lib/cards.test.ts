import { expect, test } from "vitest"
import { assertQuantity, lentOut, poolTopUp, toCard } from "./cards"

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

test("poolTopUp adds a card that isn't offered and raises an offer that can't cover the loan", () => {
  expect(poolTopUp({ cardId: "x", quantity: 2 }, { lent: 0 })).toEqual({ from: 0, to: 2 })
  expect(poolTopUp({ cardId: "x", quantity: 2 }, { offered: 3, lent: 0 })).toBeNull()
  expect(poolTopUp({ cardId: "x", quantity: 2 }, { offered: 3, lent: 2 })).toEqual({ from: 3, to: 4 })
  expect(poolTopUp({ cardId: "x", quantity: 5 }, { offered: 99, lent: 99 })).toBeNull()
})

test("assertQuantity accepts whole numbers in range only", () => {
  expect(() => assertQuantity(1)).not.toThrow()
  expect(() => assertQuantity(0, 0)).not.toThrow()
  for (const bad of [0, -1, 1.5, 100, Number.NaN]) expect(() => assertQuantity(bad)).toThrow()
})
