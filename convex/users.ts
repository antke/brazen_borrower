import { mutation, query } from "./_generated/server"
import { currentUser } from "./lib/auth"

/** Saves the signed-in Clerk user as a member, or refreshes their name. Called once per sign-in. */
export const store = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Sign in first")
    const name = (identity.name ?? identity.nickname ?? identity.email ?? "Member").slice(0, 40)
    const user = await currentUser(ctx)
    if (user) {
      if (user.name !== name) await ctx.db.patch(user._id, { name })
      return user._id
    }
    return ctx.db.insert("users", { name, tokenIdentifier: identity.tokenIdentifier })
  },
})

export const me = query({
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    return user && { _id: user._id, name: user.name }
  },
})

export const list = query({
  handler: async (ctx) =>
    (await ctx.db.query("users").collect())
      .map((u) => ({ _id: u._id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
})
