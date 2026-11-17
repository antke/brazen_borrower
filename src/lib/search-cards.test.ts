import { expect, test } from "vitest"
import { searchCards } from "./search-cards"

const card = (name: string, set = "OGN", number = "001") => ({ _id: name + set + number, name, set, number, imageUrl: "" })
const cards = [card("Fury Rune", "OGN", "007"), card("Fury Rune", "SFD", "r01"), card("Annie, Fiery"), card("Pouty Poro")]

test("matches every word across name, set and number, name prefixes first", () => {
  expect(searchCards(cards, "fury").map((c) => c.name)).toEqual(["Fury Rune", "Fury Rune", "Annie, Fiery"].slice(0, 2))
  expect(searchCards(cards, "fury sfd").map((c) => c.set)).toEqual(["SFD"])
  expect(searchCards(cards, "fie")[0].name).toBe("Annie, Fiery")
  expect(searchCards(cards, "   ")).toEqual([])
  expect(searchCards(cards, "r", 2)).toHaveLength(2)
})
