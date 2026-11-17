import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { assertQuantity } from "./lib/cards"
import { loanItem } from "./schema"

export const list = query({
  handler: async (ctx) => {
    const loans = await ctx.db.query("loans").collect()
    const rows = await Promise.all(
      loans.map(async (loan) => {
        const [lender, borrower] = await Promise.all([ctx.db.get(loan.lenderId), ctx.db.get(loan.borrowerId)])
        const items = await Promise.all(
          loan.items.map(async (item) => ({ ...item, card: await ctx.db.get(item.cardId) }))
        )
        return {
          ...loan,
          lender: lender?.name ?? "Unknown",
          borrower: borrower?.name ?? "Unknown",
          items,
        }
      })
    )
    return rows.sort((a, b) => b.lentAt - a.lentAt)
  },
})

export const create = mutation({
  args: { lenderId: v.id("people"), borrowerId: v.id("people"), items: v.array(loanItem) },
  handler: async (ctx, { lenderId, borrowerId, items }) => {
    if (lenderId === borrowerId) throw new Error("The lender and the borrower must be different people")
    if (items.length === 0) throw new Error("Add at least one card")
    if (new Set(items.map((i) => i.cardId)).size !== items.length)
      throw new Error("Each card can only be listed once; raise its quantity instead")
    for (const item of items) {
      assertQuantity(item.quantity)
      if (!(await ctx.db.get(item.cardId))) throw new Error("Unknown card")
    }
    if (!(await ctx.db.get(lenderId)) || !(await ctx.db.get(borrowerId))) throw new Error("Unknown person")
    return ctx.db.insert("loans", { lenderId, borrowerId, items, lentAt: Date.now() })
  },
})

export const markReturned = mutation({
  args: { id: v.id("loans") },
  handler: async (ctx, { id }) => {
    const loan = await ctx.db.get(id)
    if (!loan) throw new Error("Unknown loan")
    if (loan.returnedAt === undefined) await ctx.db.patch(id, { returnedAt: Date.now() })
  },
})
