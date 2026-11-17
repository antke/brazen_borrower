import { v, type Infer } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { currentUser, requireUser } from "./lib/auth"
import { assertCanLend, assertQuantity, lentOut, poolTopUp, splitReturn } from "./lib/cards"
import { cleanName, sameParty } from "./lib/parties"
import { loanItem, partyInput } from "./schema"

/** A member's current name (it follows their Clerk username); anyone else keeps the name typed in. */
async function liveName(ctx: QueryCtx, party: Doc<"loans">["lender"]) {
  if (!party.userId) return party
  return { ...party, name: (await ctx.db.get(party.userId))?.name ?? party.name }
}

async function withCards(ctx: QueryCtx, loans: Doc<"loans">[]) {
  const rows = await Promise.all(
    loans.map(async (loan) => ({
      ...loan,
      lender: await liveName(ctx, loan.lender),
      borrower: await liveName(ctx, loan.borrower),
      items: await Promise.all(loan.items.map(async (item) => ({ ...item, card: await ctx.db.get(item.cardId) }))),
    }))
  )
  return rows.sort((a, b) => b.lentAt - a.lentAt)
}

export const list = query({
  handler: async (ctx) => withCards(ctx, await ctx.db.query("loans").collect()),
})

/** Loans the signed-in member lent or borrowed; empty when signed out. */
export const mine = query({
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (!user) return []
    const loans = await ctx.db.query("loans").collect()
    return withCards(
      ctx,
      loans.filter((l) => l.lender.userId === user._id || l.borrower.userId === user._id)
    )
  },
})

async function resolveParty(ctx: QueryCtx, input: Infer<typeof partyInput>) {
  if ("userId" in input) {
    const user = await ctx.db.get(input.userId)
    if (!user) throw new Error("Unknown member")
    return { userId: user._id, name: user.name }
  }
  return { name: cleanName(input.name) }
}

export const create = mutation({
  args: { borrower: partyInput, items: v.array(loanItem) },
  handler: async (ctx, args) => {
    // You can only lend your own cards: the lender is always whoever is signed in.
    const me = await requireUser(ctx)
    const lender = { userId: me._id, name: me.name }
    const borrower = await resolveParty(ctx, args.borrower)
    if (sameParty(lender, borrower)) throw new Error("You can't lend cards to yourself")
    if (args.items.length === 0) throw new Error("Add at least one card")
    if (new Set(args.items.map((i) => i.cardId)).size !== args.items.length)
      throw new Error("Each card can only be listed once; raise its quantity instead")
    // Lending a card means having it. From your collection you can lend only the copies that aren't
    // already out; a card that isn't in your collection yet joins it. Everything is checked before anything is written.
    const out = lentOut(await ctx.db.query("loans").collect())
    const checked = []
    for (const item of args.items) {
      assertQuantity(item.quantity)
      const card = await ctx.db.get(item.cardId)
      if (!card) throw new Error("Unknown card")
      const offer = await ctx.db
        .query("pool")
        .withIndex("by_owner_card", (q) => q.eq("ownerId", me._id).eq("cardId", item.cardId))
        .unique()
      const holding = { offered: offer?.quantity, lent: out.get(`${me._id}:${item.cardId}`) ?? 0 }
      assertCanLend(item, holding, card.name)
      checked.push({ item, change: poolTopUp(item, holding) })
    }
    for (const { item, change } of checked)
      if (change) await ctx.db.insert("pool", { ownerId: me._id, cardId: item.cardId, quantity: change.to })
    return ctx.db.insert("loans", { lender, borrower, items: args.items, lentAt: Date.now() })
  },
})

export const markReturned = mutation({
  args: { id: v.id("loans") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx)
    const loan = await ctx.db.get(id)
    if (!loan) throw new Error("Unknown loan")
    if (loan.returnedAt === undefined) await ctx.db.patch(id, { returnedAt: Date.now() })
  },
})

/** Some of a loan's cards came back early. They move to a returned copy of the loan (same people,
    same lent date), and the rest stay out on this one; everything coming back just marks it returned. */
export const returnCards = mutation({
  args: { id: v.id("loans"), items: v.array(loanItem) },
  handler: async (ctx, { id, items }) => {
    await requireUser(ctx)
    const loan = await ctx.db.get(id)
    if (!loan) throw new Error("Unknown loan")
    if (loan.returnedAt !== undefined) throw new Error("This loan has already been returned")
    if (items.length === 0) throw new Error("Pick at least one card that came back")
    const { returned, stillOut } = splitReturn(loan.items, items)
    const returnedAt = Date.now()
    if (stillOut.length === 0) return ctx.db.patch(id, { returnedAt })
    await ctx.db.patch(id, { items: stillOut })
    await ctx.db.insert("loans", { lender: loan.lender, borrower: loan.borrower, items: returned, lentAt: loan.lentAt, returnedAt })
  },
})
