import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  handler: async (ctx) =>
    (await ctx.db.query("people").collect()).sort((a, b) => a.name.localeCompare(b.name)),
})

export const add = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim()
    if (!name || name.length > 40) throw new Error("Name must be 1 to 40 characters")
    const taken = await ctx.db
      .query("people")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique()
    if (taken) throw new Error(`${name} is already on the list`)
    return ctx.db.insert("people", { name })
  },
})
