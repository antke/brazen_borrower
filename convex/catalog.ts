import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction, internalMutation, query } from "./_generated/server"
import { toCard, type RiftHuntCard } from "./lib/cards"
import { cardFields } from "./schema"

// RiftHunt asks for one bulk download a day at most and a User-Agent naming the client.
const BULK_URL = "https://api.rifthunt.com/bulk/cards"

export const sync = internalAction({
  handler: async (ctx) => {
    const res = await fetch(BULK_URL, {
      headers: { "User-Agent": "card-lending-tracker/0.1" },
    })
    if (!res.ok) throw new Error(`RiftHunt bulk download failed: ${res.status}`)
    const { cards } = (await res.json()) as { cards: RiftHuntCard[] }
    if (!Array.isArray(cards) || cards.length === 0)
      throw new Error("RiftHunt bulk download had no cards")
    await ctx.runMutation(internal.catalog.upsert, { cards: cards.map(toCard) })
    return cards.length
  },
})

export const upsert = internalMutation({
  args: { cards: v.array(v.object(cardFields)) },
  handler: async (ctx, { cards }) => {
    for (const card of cards) {
      const existing = await ctx.db
        .query("cards")
        .withIndex("by_printing", (q) => q.eq("printingId", card.printingId))
        .unique()
      if (existing) await ctx.db.patch(existing._id, card)
      else await ctx.db.insert("cards", card)
    }
  },
})

export const list = query({
  handler: (ctx) => ctx.db.query("cards").collect(),
})
