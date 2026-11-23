import { expect, test } from "vitest"
import { deckIssues, deckText, deckTitle, parseDeckText, resolveDeck, zoneProblem, type DeckCardMeta, type DeckLine } from "./decks"

const riven = { name: "Riven, The Exile", type: "Legend", domains: ["Calm", "Chaos"], tags: ["Riven"] }
const rivenUnit = { name: "Riven, Broken Blade", type: "Unit", supertype: "Champion", domains: ["Chaos"], tags: ["Riven", "Noxus"] }
const yasuo = { name: "Yasuo, Remorseful", type: "Unit", supertype: "Champion", domains: ["Calm"], tags: ["Yasuo"] }
const scorcher = { name: "Blazing Scorcher", type: "Unit", domains: ["Fury"], tags: [] }
const calmUnit = { name: "Calm Unit", type: "Unit", domains: ["Calm"], tags: [] }
const signature = (n: number) => ({ name: `Riven Signature ${n}`, type: "Spell", supertype: "Signature", domains: ["Chaos"], tags: ["Riven"] })
const rune = { name: "Calm Rune", type: "Rune", supertype: "Basic", domains: ["Calm"] }
const bf = (n: number) => ({ name: `Battlefield ${n}`, type: "Battlefield", domains: ["Colorless"] })

test("a legend sets the colours and the champion; tokens and wrong zones are refused", () => {
  expect(zoneProblem(riven, "legend")).toBeNull()
  expect(zoneProblem(rivenUnit, "champion", riven)).toBeNull()
  expect(zoneProblem(yasuo, "champion", riven)).toMatch("Riven champion")
  expect(zoneProblem(scorcher, "main", riven)).toMatch("Fury is outside")
  expect(zoneProblem(calmUnit, "main", riven)).toBeNull()
  expect(zoneProblem(rune, "main", riven)).toMatch("units, spells and gear")
  expect(zoneProblem(bf(1), "battlefield", riven)).toBeNull()
  expect(zoneProblem({ name: "Gold", type: "Gear", supertype: "Token" }, "main")).toMatch("tokens")
  expect(zoneProblem({ name: "Annie Sig", type: "Spell", supertype: "Signature", tags: ["Annie"] }, "main", riven)).toMatch("only Riven signature")
})

test("deckIssues needs every zone at its size (the sideboard up to it), counting copies across champion, main and sideboard", () => {
  const lines: DeckLine[] = [
    { card: riven, quantity: 1, zone: "legend" },
    { card: rivenUnit, quantity: 1, zone: "champion" },
    { card: rivenUnit, quantity: 2, zone: "main" },
    { card: calmUnit, quantity: 3, zone: "main" },
  ]
  // Counts come first, under and over alike; an empty sideboard is fine.
  expect(deckIssues(lines).problems).toEqual(["Main deck: 5 of 39", "Runes: 0 of 12", "Battlefields: 0 of 3"])
  const complete: DeckLine[] = [
    { card: riven, quantity: 1, zone: "legend" },
    { card: rivenUnit, quantity: 1, zone: "champion" },
    ...Array.from({ length: 13 }, (_, n) => ({ card: { ...calmUnit, name: `Calm ${n}` }, quantity: 3, zone: "main" as const })),
    { card: rune, quantity: 12, zone: "rune" },
    ...[1, 2, 3].map((n) => ({ card: bf(n), quantity: 1, zone: "battlefield" as const })),
  ]
  expect(deckIssues(complete).problems).toEqual([])
  expect(deckIssues([...complete, { card: calmUnit, quantity: 11, zone: "side" }]).problems).toContain("Sideboard: 11 of up to 10")
  const bad = deckIssues([
    ...lines,
    { card: rivenUnit, quantity: 1, zone: "side" },
    { card: bf(1), quantity: 2, zone: "battlefield" },
    ...[1, 2, 3, 4].map((n) => ({ card: signature(n), quantity: 1, zone: "main" as const })),
  ])
  expect(bad.problems).toEqual([
    "Main deck: 9 of 39",
    "Runes: 0 of 12",
    "Battlefields: 2 of 3",
    "Riven, Broken Blade: at most 3 copies, counting the chosen champion and sideboard",
    "Battlefields must all be different",
    "At most 3 signature cards, not 4",
  ])
})

test("an exported deck imports back to the same cards", () => {
  const cards: DeckCardMeta[] = [riven, rivenUnit, calmUnit, rune, bf(1), bf(2)]
  const lines: DeckLine[] = [
    { card: riven, quantity: 1, zone: "legend" },
    { card: rivenUnit, quantity: 1, zone: "champion" },
    { card: calmUnit, quantity: 3, zone: "main" },
    { card: rune, quantity: 12, zone: "rune" },
    { card: bf(2), quantity: 1, zone: "battlefield" },
    { card: bf(1), quantity: 1, zone: "battlefield" },
    { card: calmUnit, quantity: 1, zone: "side" },
  ]
  const text = deckText(lines)
  expect(text).toContain("Legend:\n1 Riven, The Exile\n\nChampion:")
  expect(text).toContain("Battlefields:\n1 Battlefield 1\n1 Battlefield 2")
  const back = resolveDeck(parseDeckText(text), (name) => cards.find((c) => c.name === name))
  expect(back.unknown).toEqual([])
  expect(deckText(back.lines)).toBe(text)
  expect(deckTitle("", lines)).toBe("Riven, The Exile + Riven, Broken Blade")
  expect(deckTitle("  Mine ", lines)).toBe("Mine")
})

test("reads TopDeck's ~~headings~~ with escaped newlines, infers the champion, and sorts a bare list by type", () => {
  const cards: DeckCardMeta[] = [riven, rivenUnit, calmUnit, rune]
  const find = (name: string) => cards.find((c) => c.name.toLowerCase() === name.toLowerCase())
  const topdeck = resolveDeck(parseDeckText("~~Legend~~\\n1 Riven, The Exile\\n~~Mainboard~~\\n3 Riven, Broken Blade\\n2 Nope"), find)
  expect(topdeck.unknown).toEqual(["Nope"])
  expect(topdeck.lines.map((l) => [l.card.name, l.zone, l.quantity])).toEqual([
    ["Riven, The Exile", "legend", 1],
    ["Riven, Broken Blade", "main", 2],
    ["Riven, Broken Blade", "champion", 1],
  ])
  const bare = resolveDeck(parseDeckText("1 riven, the exile\n12x Calm Rune\n3 Calm Unit"), find)
  expect(bare.lines.map((l) => l.zone)).toEqual(["legend", "rune", "main"])
  expect(() => parseDeckText("Graveyard:\n1 X")).toThrow("Unknown section")
  expect(() => parseDeckText("Legend:\nRiven")).toThrow("Can't read")
})

test("every printing of a card is the same card: copies count together and the list names the card once", () => {
  const alt = { ...calmUnit, name: "Calm Unit (Alternate Art)" }
  const lines: DeckLine[] = [
    { card: calmUnit, quantity: 2, zone: "main" },
    { card: alt, quantity: 2, zone: "main" },
  ]
  expect(deckIssues(lines).problems).toContain("Calm Unit: at most 3 copies, counting the chosen champion and sideboard")
  expect(deckText(lines)).toBe("MainDeck:\n4 Calm Unit\n")
  expect(deckIssues([
    { card: bf(1), quantity: 1, zone: "battlefield" },
    { card: { ...bf(1), name: "Battlefield 1 (Overnumbered)" }, quantity: 1, zone: "battlefield" },
  ]).problems).toContain("Battlefields must all be different")
})
