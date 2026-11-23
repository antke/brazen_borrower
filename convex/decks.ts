import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { currentUser, requireUser } from "./lib/auth"
import { assertQuantity } from "./lib/cards"
import { deckCard } from "./schema"

/** The signed-in member's decks with their cards, newest change first; empty when signed out. */
export const mine = query({
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (!user) return []
    const decks = await ctx.db
      .query("decks")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect()
    const withCards = await Promise.all(
      decks.map(async (deck) => ({
        ...deck,
        cards: await Promise.all(deck.cards.map(async (line) => ({ ...line, card: await ctx.db.get(line.cardId) }))),
      }))
    )
    return withCards.sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

/** Creates a deck, or replaces one of the member's own. Any deck saves, legal or not: the decks list marks the ones that
    aren't (deckIssues), so a list can be kept while it's being finished. */
export const save = mutation({
  args: { id: v.optional(v.id("decks")), name: v.string(), cards: v.array(deckCard) },
  handler: async (ctx, { id, name, cards }) => {
    const user = await requireUser(ctx)
    if (id) {
      const deck = await ctx.db.get(id)
      if (!deck || deck.ownerId !== user._id) throw new Error("Unknown deck")
    }
    if (name.trim().length > 80) throw new Error("Deck names are 80 characters at most")
    const seen = new Set<string>()
    for (const line of cards) {
      assertQuantity(line.quantity)
      // A card's copies in a zone can be split by status (2 available, 1 posted), one line each.
      const key = `${line.cardId}:${line.zone}:${line.status}`
      if (seen.has(key)) throw new Error("A card is listed twice in one zone")
      seen.add(key)
      const card = await ctx.db.get(line.cardId)
      if (!card) throw new Error("Unknown card")
    }
    const deck = { name: name.trim(), cards, updatedAt: Date.now() }
    if (id) {
      await ctx.db.patch(id, deck)
      return id
    }
    return ctx.db.insert("decks", { ownerId: user._id, ...deck })
  },
})

export const remove = mutation({
  args: { id: v.id("decks") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx)
    const deck = await ctx.db.get(id)
    if (!deck || deck.ownerId !== user._id) throw new Error("Unknown deck")
    await ctx.db.delete(id)
  },
})
