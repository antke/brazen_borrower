import { v, type Infer } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"
import { currentUser, requireUser } from "./lib/auth"
import { assertQuantity } from "./lib/cards"
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
  args: { lender: partyInput, borrower: partyInput, items: v.array(loanItem) },
  handler: async (ctx, args) => {
    await requireUser(ctx)
    const [lender, borrower] = await Promise.all([resolveParty(ctx, args.lender), resolveParty(ctx, args.borrower)])
    if (sameParty(lender, borrower)) throw new Error("The lender and the borrower must be different people")
    if (args.items.length === 0) throw new Error("Add at least one card")
    if (new Set(args.items.map((i) => i.cardId)).size !== args.items.length)
      throw new Error("Each card can only be listed once; raise its quantity instead")
    for (const item of args.items) {
      assertQuantity(item.quantity)
      if (!(await ctx.db.get(item.cardId))) throw new Error("Unknown card")
    }
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
