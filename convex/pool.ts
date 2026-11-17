import { v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { currentUser, requireUser } from "./lib/auth"
import { assertCanSetCopies, assertQuantity, lentOut } from "./lib/cards"

async function withAvailability(ctx: QueryCtx, entries: Doc<"pool">[]) {
  const out = lentOut(await ctx.db.query("loans").collect())
  const rows = await Promise.all(
    entries.map(async (entry) => {
      const [owner, card] = await Promise.all([ctx.db.get(entry.ownerId), ctx.db.get(entry.cardId)])
      const lent = out.get(`${entry.ownerId}:${entry.cardId}`) ?? 0
      return { ...entry, owner: owner?.name ?? "Unknown", card, lent, available: Math.max(0, entry.quantity - lent) }
    })
  )
  return rows.sort((a, b) => (a.card?.name ?? "").localeCompare(b.card?.name ?? ""))
}

export const list = query({
  handler: async (ctx) => withAvailability(ctx, await ctx.db.query("pool").collect()),
})

/** The signed-in member's own offers; empty when signed out. */
export const mine = query({
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (!user) return []
    const entries = await ctx.db
      .query("pool")
      .withIndex("by_owner_card", (q) => q.eq("ownerId", user._id))
      .collect()
    return withAvailability(ctx, entries)
  },
})

/** Sets how many copies of a card the signed-in member offers; 0 takes it out of the pool. Never below the copies lent out. */
export const set = mutation({
  args: { cardId: v.id("cards"), quantity: v.number() },
  handler: async (ctx, { cardId, quantity }) => {
    const user = await requireUser(ctx)
    assertQuantity(quantity, 0)
    const card = await ctx.db.get(cardId)
    if (!card) throw new Error("Unknown card")
    // Copies out on loan can't be taken out of the collection until they come back.
    const lent = lentOut(await ctx.db.query("loans").collect()).get(`${user._id}:${cardId}`) ?? 0
    assertCanSetCopies(quantity, lent, card.name)
    const existing = await ctx.db
      .query("pool")
      .withIndex("by_owner_card", (q) => q.eq("ownerId", user._id).eq("cardId", cardId))
      .unique()
    if (quantity === 0) {
      if (existing) await ctx.db.delete(existing._id)
    } else if (existing) await ctx.db.patch(existing._id, { quantity })
    else await ctx.db.insert("pool", { ownerId: user._id, cardId, quantity })
  },
})
