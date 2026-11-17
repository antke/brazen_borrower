import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

const status = v.union(v.literal("todo"), v.literal("doing"), v.literal("done"))

export const list = query({
  handler: (ctx) => ctx.db.query("tasks").order("desc").collect(),
})

export const add = mutation({
  args: { text: v.string() },
  handler: (ctx, { text }) => ctx.db.insert("tasks", { text, status: "todo" }),
})

export const setStatus = mutation({
  args: { id: v.id("tasks"), status },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
})
