import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { assertQuantity, lentOut } from "./lib/cards"

export const list = query({
  handler: async (ctx) => {
    const [entries, loans] = await Promise.all([
      ctx.db.query("pool").collect(),
      ctx.db.query("loans").collect(),
    ])
    const out = lentOut(loans)
    const rows = await Promise.all(
      entries.map(async (entry) => {
        const [owner, card] = await Promise.all([ctx.db.get(entry.ownerId), ctx.db.get(entry.cardId)])
        const lent = out.get(`${entry.ownerId}:${entry.cardId}`) ?? 0
        return {
          ...entry,
          owner: owner?.name ?? "Unknown",
          card,
          lent,
          available: Math.max(0, entry.quantity - lent),
        }
      })
    )
    return rows.sort((a, b) => (a.card?.name ?? "").localeCompare(b.card?.name ?? ""))
  },
})

/** Sets how many copies of a card a person offers; 0 takes it out of the pool. */
export const set = mutation({
  args: { ownerId: v.id("people"), cardId: v.id("cards"), quantity: v.number() },
  handler: async (ctx, { ownerId, cardId, quantity }) => {
    assertQuantity(quantity, 0)
    if (!(await ctx.db.get(ownerId))) throw new Error("Unknown person")
    if (!(await ctx.db.get(cardId))) throw new Error("Unknown card")
    const existing = await ctx.db
      .query("pool")
      .withIndex("by_owner_card", (q) => q.eq("ownerId", ownerId).eq("cardId", cardId))
      .unique()
    if (quantity === 0) {
      if (existing) await ctx.db.delete(existing._id)
    } else if (existing) await ctx.db.patch(existing._id, { quantity })
    else await ctx.db.insert("pool", { ownerId, cardId, quantity })
  },
})
