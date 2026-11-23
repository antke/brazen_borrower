/** Riftbound deck codes, the shared format Piltover Archive and other deck sites read and write
    (github.com/Piltover-Archive/RiftboundDeckCodes, Apache-2.0; this follows its v1.5.0 reference): varints in base32.
    Card codes look like "OGN-007a", "RAD-R01", "RAD-SP1", "OGN-299*". */

const SETS = ["OGN", "OGS", "ARC", "SFD", "UNL", "VEN", "RAD"]
const VARIANTS = ["", "A", "*", "B"]
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const PREFIXES = ["", "R", "SP"]

export type CodeCard = { code: string; count: number }
export type CodeDeck = { main: CodeCard[]; side: CodeCard[]; champion?: string; legends?: string[] }

type Ref = { set: number; variant: number; prefix: number; num: number; sortKey: string }

/** A card code's parts, or null when the format can't carry it (another set, an unknown variant). */
export function parseCardCode(code: string): Ref | null {
  const m = /^([A-Z]{3})-(R|SP)?(\d+)([A-Z*]?)$/.exec(code.toUpperCase().replace(/S$/, "*"))
  if (!m) return null
  const set = SETS.indexOf(m[1])
  const variant = VARIANTS.indexOf(m[4])
  if (set < 0 || variant < 0) return null
  return { set, variant, prefix: PREFIXES.indexOf(m[2] ?? ""), num: Number(m[3]), sortKey: (m[2] ?? "") + m[3] }
}

const varint = (n: number) => {
  const out: number[] = []
  do {
    out.push((n & 0x7f) | (n > 0x7f ? 0x80 : 0))
    n >>>= 7
  } while (n)
  return out
}

/** The deck as a code. Like the reference, it writes version 3, or 4 with runes numbered "R…", or 5 with "SP" cards or
    more copies than 12 (main) or 3 (sideboard). Throws on a card code the format can't carry. */
export function encodeDeckCode({ main, side, champion }: CodeDeck) {
  const ref = (code: string) => parseCardCode(code) ?? fail(`${code} can't go in a deck code`)
  const refs = [...main, ...side].map((c) => ref(c.code)).concat(champion ? [ref(champion)] : [])
  const special = refs.some((r) => r.prefix === 2)
  const sparse = special || main.some((c) => c.count > 12) || side.some((c) => c.count > 3)
  const flagged = special || refs.some((r) => r.prefix === 1)
  const version = sparse ? 5 : flagged ? 4 : 3
  const bytes = [0x10 | version]
  if (sparse) bytes.push(flagged ? 1 : 0)
  const number = (r: Ref) => (flagged ? [r.prefix, ...varint(r.num)] : varint(r.num))

  function section(cards: CodeCard[], max: number) {
    const counts = sparse ? [...new Set(cards.map((c) => c.count))].sort((a, b) => b - a) : Array.from({ length: max }, (_, i) => max - i)
    if (sparse) bytes.push(...varint(counts.length))
    for (const count of counts) {
      if (sparse) bytes.push(...varint(count))
      const groups = [...Map.groupBy(cards.filter((c) => c.count === count).map((c) => ref(c.code)), (r) => r.set * 16 + r.variant)].sort(
        ([a], [b]) => a - b
      )
      bytes.push(...varint(groups.length))
      for (const [, group] of groups) {
        bytes.push(...varint(group.length), group[0].set, group[0].variant)
        group.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }))
        for (const r of group) bytes.push(...number(r))
      }
    }
  }
  for (const c of [...main, ...side]) if (!Number.isSafeInteger(c.count) || c.count < 1) fail(`Bad count for ${c.code}`)
  section(main, 12)
  section(side, 3)
  if (champion) {
    const r = ref(champion)
    bytes.push(1, r.set, r.variant, ...number(r))
  } else bytes.push(0)

  let code = ""
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xfff
    bits += 8
    while (bits >= 5) code += B32[(buffer >> (bits -= 5)) & 31]
  }
  return bits ? code + B32[(buffer << (5 - bits)) & 31] : code
}

/** Reads a code of any version (1 to 6). Card codes come back upper case, signed cards with "*". Throws on a code it
    can't read. */
export function decodeDeckCode(text: string): CodeDeck {
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of text.trim().toUpperCase()) {
    const value = B32.indexOf(char)
    if (value < 0) fail("That isn't a deck code")
    buffer = ((buffer << 5) | value) & 0xfff
    bits += 5
    if (bits >= 8) bytes.push((buffer >> (bits -= 8)) & 0xff)
  }
  let at = 0
  const byte = () => (at < bytes.length ? bytes[at++] : fail("That deck code is cut short"))
  const read = () => {
    let n = 0
    for (let shift = 0; ; shift += 7) {
      const b = byte()
      n += (b & 0x7f) * 2 ** shift
      if (!(b & 0x80)) return n
    }
  }
  const head = byte()
  const version = head & 15
  if (head >> 4 !== 1 || version < 1 || version > 6) fail("That deck code is from a format this app doesn't know")
  const flagged = version >= 5 ? byte() === 1 : version === 4
  const card = (set: number, variant: number) => {
    const prefix = flagged ? byte() : 0
    const num = read()
    const digits = prefix === 2 ? String(num) : String(num).padStart(prefix === 1 ? 2 : 3, "0")
    if (SETS[set] === undefined || VARIANTS[variant] === undefined || PREFIXES[prefix] === undefined)
      fail("That deck code has cards this app doesn't know")
    return `${SETS[set]}-${PREFIXES[prefix]}${digits}${VARIANTS[variant]}`
  }
  const section = (max: number) => {
    const out: CodeCard[] = []
    const counts = version >= 5 ? read() : max
    for (let i = 0; i < counts; i++) {
      const count = version >= 5 ? read() : max - i
      for (let groups = read(); groups > 0; groups--) {
        const size = read()
        const set = byte()
        const variant = byte()
        for (let j = 0; j < size; j++) out.push({ code: card(set, variant), count })
      }
    }
    return out
  }
  const main = section(12)
  const side = version >= 2 ? section(3) : []
  const champion = version >= 3 && byte() === 1 ? card(byte(), byte()) : undefined
  const legends = version >= 6 ? Array.from({ length: read() }, () => card(byte(), byte())) : undefined
  return { main, side, champion, legends }
}

function fail(message: string): never {
  throw new Error(message)
}
