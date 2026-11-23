/** Riftbound deck rules, shared by the server (which refuses an illegal deck) and the deck builder (which explains why). */

export type DeckZone = "legend" | "champion" | "main" | "rune" | "battlefield" | "side"
export type DeckStatus = "available" | "borrowed" | "posted" | "awaiting" | "lent" | "missing"
export type DeckCardMeta = { name: string; type?: string; supertype?: string; domains?: string[]; tags?: string[] }
export type DeckLine<C extends DeckCardMeta = DeckCardMeta> = { card: C; quantity: number; zone: DeckZone }

/** Every zone, in deck order, with the cards it holds when complete. The sideboard holds up to its size. */
export const ZONES: { zone: DeckZone; label: string; size: number }[] = [
  { zone: "legend", label: "Legend", size: 1 },
  { zone: "champion", label: "Chosen champion", size: 1 },
  { zone: "main", label: "Main deck", size: 39 },
  { zone: "rune", label: "Runes", size: 12 },
  { zone: "battlefield", label: "Battlefields", size: 3 },
  { zone: "side", label: "Sideboard", size: 10 },
]

export const STATUSES: { status: DeckStatus; label: string }[] = [
  { status: "available", label: "Available" },
  { status: "borrowed", label: "Borrowed" },
  { status: "posted", label: "Posted" },
  { status: "awaiting", label: "Awaiting postage" },
  { status: "lent", label: "Lent" },
  { status: "missing", label: "Not in collection" },
]

const MAX_COPIES = 3
const MAX_SIGNATURES = 3
const PLAYABLE = ["Unit", "Spell", "Gear"]

/** The champion a legend calls for: the tag matching the name before its comma ("Riven, The Exile" → "Riven"). */
export function championTag(legend: DeckCardMeta) {
  const name = legend.name.split(",")[0].trim()
  return legend.tags?.find((tag) => tag.toLowerCase() === name.toLowerCase()) ?? name
}

/** A card's name without its printing's note: "Ahri, Alluring (Alternate Art)" → "Ahri, Alluring". Every printing of a
    card is the same card to the rules (copies, battlefields) and in an exported list. */
export const baseName = (name: string) => name.replace(/ \([^)]*\)$/, "")

const hasTag = (card: DeckCardMeta, tag: string) => card.tags?.some((t) => t.toLowerCase() === tag.toLowerCase()) ?? false

/** Why a card can't go in a zone of a deck led by `legend`, or null when it can. */
export function zoneProblem(card: DeckCardMeta, zone: DeckZone, legend?: DeckCardMeta): string | null {
  // shortcut: a card synced before deck metadata existed can't be judged; the daily sync fills it in.
  if (card.type === undefined) return null
  if (card.supertype === "Token") return "tokens don't go in a deck"
  if (zone === "legend") return card.type === "Legend" ? null : "only a Legend can lead a deck"
  if (card.type === "Legend") return "a Legend goes in the legend slot"
  if (zone === "rune" && card.type !== "Rune") return "only runes go in the rune deck"
  if (zone === "battlefield" && card.type !== "Battlefield") return "only battlefields go there"
  if ((zone === "main" || zone === "side") && !PLAYABLE.includes(card.type)) return "only units, spells and gear go in the main deck and sideboard"
  if (zone === "champion" && (card.supertype !== "Champion" || card.type !== "Unit")) return "the chosen champion must be a champion unit"
  if (!legend) return null
  const tag = championTag(legend)
  if (zone === "champion" && !hasTag(card, tag)) return `${legend.name} needs a ${tag} champion`
  if (card.supertype === "Signature" && !hasTag(card, tag)) return `only ${tag} signature cards fit this legend`
  const outside = (card.domains ?? []).filter((d) => d !== "Colorless" && !legend.domains?.includes(d))
  return outside.length ? `${outside.join(" and ")} is outside ${legend.name}'s colours` : null
}

/** Why a deck can't be saved: every zone at its size (the sideboard up to its size), then any illegal card. A deck is
    only saved complete, as constructed play needs it: 1 legend, the chosen champion and 39 more (40 main deck cards),
    12 runes, 3 battlefields and up to 10 in the sideboard. */
export function deckIssues(lines: DeckLine[]) {
  const problems: string[] = []
  for (const { zone, label, size } of ZONES) {
    const count = lines.filter((l) => l.zone === zone).reduce((sum, l) => sum + l.quantity, 0)
    if (zone === "side" ? count > size : count !== size) problems.push(`${label}: ${count} of ${zone === "side" ? `up to ${size}` : size}`)
  }
  const legend = lines.find((l) => l.zone === "legend")?.card
  for (const line of lines) {
    const problem = zoneProblem(line.card, line.zone, legend)
    if (problem) problems.push(`${line.card.name}: ${problem}`)
  }
  const copies = new Map<string, number>()
  for (const line of lines)
    if (line.zone === "champion" || line.zone === "main" || line.zone === "side")
      copies.set(baseName(line.card.name), (copies.get(baseName(line.card.name)) ?? 0) + line.quantity)
  for (const [name, count] of copies) if (count > MAX_COPIES) problems.push(`${name}: at most ${MAX_COPIES} copies, counting the chosen champion and sideboard`)
  const battlefields = lines.filter((l) => l.zone === "battlefield")
  if (battlefields.some((l) => l.quantity > 1) || new Set(battlefields.map((l) => baseName(l.card.name))).size < battlefields.length)
    problems.push("Battlefields must all be different")
  const signatures = lines.filter((l) => l.card.supertype === "Signature").reduce((sum, l) => sum + l.quantity, 0)
  if (signatures > MAX_SIGNATURES) problems.push(`At most ${MAX_SIGNATURES} signature cards, not ${signatures}`)
  return { problems }
}

/** A deck's own name, or its legend and chosen champion until it's named. */
export function deckTitle(name: string, lines: DeckLine[]) {
  const pick = (zone: DeckZone) => {
    const card = lines.find((l) => l.zone === zone)?.card
    return card && baseName(card.name)
  }
  return name.trim() || [pick("legend"), pick("champion")].filter(Boolean).join(" + ") || "Untitled deck"
}

const EXPORT_HEADINGS: [DeckZone, string][] = [
  ["legend", "Legend"],
  ["champion", "Champion"],
  ["main", "MainDeck"],
  ["battlefield", "Battlefields"],
  ["rune", "Rune Pool"],
  ["side", "Sideboard"],
]

/** The deck as text, in the sectioned format the deck comparison tool exports and reads back. */
export function deckText(lines: DeckLine[]) {
  return (
    EXPORT_HEADINGS.flatMap(([zone, heading]) => {
      const counts = new Map<string, number>()
      for (const l of lines) if (l.zone === zone) counts.set(baseName(l.card.name), (counts.get(baseName(l.card.name)) ?? 0) + l.quantity)
      if (counts.size === 0) return []
      const rows = [...counts].sort(([a], [b]) => a.localeCompare(b, "en")).map(([name, n]) => `${n} ${name}`)
      return [[`${heading}:`, ...rows].join("\n")]
    }).join("\n\n") + "\n"
  )
}

/** Every card the deck needs, as "3 Card Name" rows: one per card name, its copies across every zone added up. */
export function buyList(lines: DeckLine[]) {
  const counts = new Map<string, number>()
  for (const l of lines) counts.set(baseName(l.card.name), (counts.get(baseName(l.card.name)) ?? 0) + l.quantity)
  return [...counts].sort(([a], [b]) => a.localeCompare(b, "en")).map(([name, n]) => `${n} ${name}\n`).join("")
}

const HEADINGS: Record<string, DeckZone> = {
  legend: "legend",
  champion: "champion",
  "chosen champion": "champion",
  maindeck: "main",
  "main deck": "main",
  mainboard: "main",
  main: "main",
  battlefields: "battlefield",
  battlefield: "battlefield",
  "rune pool": "rune",
  runes: "rune",
  sideboard: "side",
}

export const cardKey = (name: string) => name.normalize("NFC").trim().replace(/\s+/gu, " ").replace(/[‘’]/gu, "'").toLowerCase()

/** One parsed line: no zone when the list has no headings (the card's type decides then). */
export type ParsedLine = { name: string; quantity: number; zone?: DeckZone }

/** Reads a pasted list: "Heading:" or "~~Heading~~" sections of "3 Card Name" lines, or bare lines with no headings. */
export function parseDeckText(text: string): ParsedLine[] {
  // TopDeck's text export arrives with literal "\n" and escaped apostrophes.
  const decoded = text.replace(/\\r\\n|\\n/g, "\n").replace(/\\'/g, "'")
  const out: ParsedLine[] = []
  let zone: DeckZone | undefined
  for (const raw of decoded.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const heading = /^~~(.+)~~$/.exec(line)?.[1] ?? /^([^\d].*):$/.exec(line)?.[1]
    if (heading !== undefined) {
      zone = HEADINGS[cardKey(heading)]
      if (!zone) throw new Error(`Unknown section “${heading}”`)
      continue
    }
    const card = /^(\d+)\s*x?\s+(.+)$/i.exec(line)
    if (!card) throw new Error(`Can't read “${line}”: lines look like “3 Card Name”`)
    out.push({ name: card[2].trim(), quantity: Number(card[1]), zone })
  }
  return out
}

/** Turns parsed lines into deck lines with `find` (a card by name). Unheaded cards go where their type belongs, and a list
    with no chosen champion gets one copy of the legend's champion from the main deck, as the comparison tool infers it. */
export function resolveDeck<C extends DeckCardMeta>(parsed: ParsedLine[], find: (name: string) => C | undefined) {
  const unknown: string[] = []
  const lines: DeckLine<C>[] = []
  for (const p of parsed) {
    const card = find(p.name)
    if (!card) {
      unknown.push(p.name)
      continue
    }
    const zone: DeckZone =
      p.zone ?? (card.type === "Legend" ? "legend" : card.type === "Rune" ? "rune" : card.type === "Battlefield" ? "battlefield" : "main")
    const same = lines.find((l) => l.card === card && l.zone === zone)
    if (same) same.quantity += p.quantity
    else lines.push({ card, quantity: p.quantity, zone })
  }
  const legend = lines.find((l) => l.zone === "legend")?.card
  if (legend && !lines.some((l) => l.zone === "champion")) {
    const tag = championTag(legend)
    const candidates = lines.filter((l) => l.zone === "main" && l.card.supertype === "Champion" && hasTag(l.card, tag))
    if (candidates.length === 1) {
      const from = candidates[0]
      if (--from.quantity === 0) lines.splice(lines.indexOf(from), 1)
      lines.push({ card: from.card, quantity: 1, zone: "champion" })
    }
  }
  return { lines, unknown }
}
