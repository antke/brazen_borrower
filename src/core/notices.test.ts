import { expect, test, vi } from "vitest"
import { cardsPhrase, notify, onNotice } from "./notices"

test("one card is named with its copies; several are counted", () => {
  expect(cardsPhrase([{ name: "XYZ", quantity: 5 }])).toBe("XYZ ×5")
  expect(cardsPhrase([{ name: "XYZ", quantity: 1 }])).toBe("XYZ")
  expect(cardsPhrase([{ name: "XYZ", quantity: 5 }, ...["A", "B", "C"].map((name) => ({ name, quantity: 1 }))])).toBe("4 cards")
})

test("a notice reaches every listener until it stops listening", () => {
  const heard = vi.fn()
  const stop = onNotice(heard)
  notify({ title: "One" })
  stop()
  notify({ title: "Two" })
  expect(heard).toHaveBeenCalledExactlyOnceWith({ title: "One" })
})
