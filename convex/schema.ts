import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const cardFields = {
  printingId: v.string(),
  name: v.string(),
  set: v.string(),
  number: v.string(),
  rarity: v.string(),
  imageUrl: v.string(),
  // Deck-building metadata. Optional only because cards stored before it was synced lack it until the next sync.
  type: v.optional(v.string()),
  supertype: v.optional(v.string()),
  domains: v.optional(v.array(v.string())),
  tags: v.optional(v.array(v.string())),
}

export const loanItem = v.object({ cardId: v.id("cards"), quantity: v.number() })

/** A lender or borrower: a member of the app, or anyone else by name. Members keep their name as it was then. */
export const party = v.object({ userId: v.optional(v.id("users")), name: v.string() })
/** What a client sends for a party: a member's id, or a typed name. */
export const partyInput = v.union(v.object({ userId: v.id("users") }), v.object({ name: v.string() }))

export const deckZone = v.union(
  v.literal("legend"),
  v.literal("champion"),
  v.literal("main"),
  v.literal("rune"),
  v.literal("battlefield"),
  v.literal("side")
)
/** Where a deck's copies of a card are: in hand, in the post, paid for but not yet sent, or lent to a friend. */
export const deckCardStatus = v.union(v.literal("available"), v.literal("borrowed"), v.literal("posted"), v.literal("awaiting"), v.literal("lent"), v.literal("missing"))
export const deckCard = v.object({ cardId: v.id("cards"), quantity: v.number(), zone: deckZone, status: deckCardStatus })

export default defineSchema({
  cards: defineTable(cardFields).index("by_printing", ["printingId"]),
  users: defineTable({ name: v.string(), tokenIdentifier: v.string() }).index("by_token", ["tokenIdentifier"]),
  pool: defineTable({
    ownerId: v.id("users"),
    cardId: v.id("cards"),
    quantity: v.number(),
  }).index("by_owner_card", ["ownerId", "cardId"]),
  loans: defineTable({
    lender: party,
    borrower: party,
    items: v.array(loanItem),
    lentAt: v.number(),
    returnedAt: v.optional(v.number()),
  }),
  decks: defineTable({
    ownerId: v.id("users"),
    /** Empty until the member names it; shown as legend and champion meanwhile. */
    name: v.string(),
    cards: v.array(deckCard),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),
})
