import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const cardFields = {
  printingId: v.string(),
  name: v.string(),
  set: v.string(),
  number: v.string(),
  rarity: v.string(),
  imageUrl: v.string(),
}

export const loanItem = v.object({ cardId: v.id("cards"), quantity: v.number() })

/** A lender or borrower: a member of the app, or anyone else by name. Members keep their name as it was then. */
export const party = v.object({ userId: v.optional(v.id("users")), name: v.string() })
/** What a client sends for a party: a member's id, or a typed name. */
export const partyInput = v.union(v.object({ userId: v.id("users") }), v.object({ name: v.string() }))

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
})
