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

export default defineSchema({
  cards: defineTable(cardFields).index("by_printing", ["printingId"]),
  people: defineTable({ name: v.string() }).index("by_name", ["name"]),
  pool: defineTable({
    ownerId: v.id("people"),
    cardId: v.id("cards"),
    quantity: v.number(),
  }).index("by_owner_card", ["ownerId", "cardId"]),
  loans: defineTable({
    lenderId: v.id("people"),
    borrowerId: v.id("people"),
    items: v.array(loanItem),
    lentAt: v.number(),
    returnedAt: v.optional(v.number()),
  }),
})
