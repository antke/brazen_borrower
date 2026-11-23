import { expect, test } from "vitest"
import type { Card } from "./cards"
import { decodeDeckCode, encodeDeckCode } from "./deck-code"
import { buyList, deckCode, isDeckCode, parseDeckCode } from "./decks"

// The Kai'Sa deck from the reference library's README: a version 2 code, so a sideboard but no chosen champion.
const KAISA = "CIAAAAAAAAAQCAAAA4AACAIAABMQAAILAAAAICIMDMOVOX3AM5UHIAIDAAACO6XYAEAQKAAABX3QDGACUABKIAQAAEBQAAAWDBOQCAQAABMHE"

test("the reference deck code reads back to its cards and writes out to the same bytes", () => {
  const deck = decodeDeckCode(KAISA)
  expect(deck.champion).toBeUndefined()
  expect(deck.main).toContainEqual({ code: "OGN-007", count: 7 })
  expect(deck.main).toContainEqual({ code: "OGN-292", count: 1 })
  expect(deck.side).toEqual([
    { code: "OGN-022", count: 2 },
    { code: "OGN-024", count: 2 },
    { code: "OGN-093", count: 2 },
    { code: "OGN-088", count: 1 },
    { code: "OGN-114", count: 1 },
  ])
  // Written as version 3, it differs only in the version (first two letters) and the no-champion byte at the end.
  const code = encodeDeckCode(deck)
  expect(code.slice(0, 2)).toBe("CM")
  expect(code.slice(2, KAISA.length - 1)).toBe(KAISA.slice(2, -1))
  expect(decodeDeckCode(code)).toEqual(deck)
  expect(isDeckCode(KAISA)).toBe(true)
  expect(isDeckCode("Legend:\n1 Riven, The Exile")).toBe(false)
})

test("runes, special and signed cards and high counts round-trip (versions 4 and 5)", () => {
  const runes = { main: [{ code: "RAD-R01A", count: 6 }, { code: "OGN-299*", count: 1 }], side: [], champion: "OGN-299*" }
  expect(decodeDeckCode(encodeDeckCode(runes))).toEqual({ ...runes, legends: undefined })
  const special = { main: [{ code: "SFD-010", count: 20 }, { code: "RAD-SP1", count: 1 }], side: [{ code: "OGN-001B", count: 1 }], champion: undefined }
  expect(decodeDeckCode(encodeDeckCode(special))).toEqual({ ...special, legends: undefined })
  expect(() => encodeDeckCode({ main: [{ code: "OPP-269", count: 1 }], side: [] })).toThrow("can't go in a deck code")
  expect(() => decodeDeckCode("not a code!")).toThrow()
})

const card = (name: string, set: string, number: string, type = "Unit") => ({ _id: set + number, name, set, number, type }) as unknown as Card

test("a deck becomes a code with every zone in it, and a code comes back with its chosen champion moved out", () => {
  const legend = card("Riven, The Exile", "OGN", "270", "Legend")
  const riven = card("Riven, Broken Blade", "OGN", "040")
  // A promo printing the format can't carry goes in as the plainest printing of the same card.
  const promo = card("Pouty Poro (Metal)", "OPP", "013")
  const poro = card("Pouty Poro", "OGN", "013")
  const rune = card("Calm Rune", "RAD", "r02", "Rune")
  const code = deckCode(
    [
      { card: legend, quantity: 1, zone: "legend" },
      { card: riven, quantity: 1, zone: "champion" },
      { card: riven, quantity: 2, zone: "main" },
      { card: promo, quantity: 3, zone: "main" },
      { card: rune, quantity: 12, zone: "rune" },
      { card: poro, quantity: 1, zone: "side" },
    ],
    [promo, poro]
  )
  expect(parseDeckCode(code)).toEqual(
    expect.arrayContaining([
      { name: "OGN-270", quantity: 1 },
      { name: "OGN-040", quantity: 2 },
      { name: "OGN-013", quantity: 3 },
      { name: "RAD-R02", quantity: 12 },
      { name: "OGN-013", quantity: 1, zone: "side" },
      { name: "OGN-040", quantity: 1, zone: "champion" },
    ])
  )
  expect(() => deckCode([{ card: promo, quantity: 1, zone: "main" }], [promo])).toThrow("Pouty Poro has no printing")
})

test("a buy list is one row per card name, its copies in every zone added up", () => {
  const poro = card("Pouty Poro", "OGN", "013")
  const alt = card("Pouty Poro (Alternate Art)", "OGN", "013a")
  const lines = [
    { card: poro, quantity: 1, zone: "main" as const },
    { card: alt, quantity: 1, zone: "side" as const },
    { card: card("Ahri, Alluring", "OGN", "066"), quantity: 2, zone: "main" as const },
  ]
  expect(buyList(lines)).toBe("2 Ahri, Alluring\n2 Pouty Poro\n")
})
