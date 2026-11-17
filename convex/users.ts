import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { currentUser, requireUser } from "./lib/auth"
import { cleanName } from "./lib/parties"

/** Saves the signed-in Clerk user as a member on first sign-in; later sign-ins leave their chosen name alone. */
export const store = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Sign in first")
    const user = await currentUser(ctx)
    if (user) return user._id
    // Not the email: member names are shown to everyone, signed in or not.
    const name = (identity.name ?? identity.nickname ?? "Member").slice(0, 40)
    return ctx.db.insert("users", { name, tokenIdentifier: identity.tokenIdentifier })
  },
})

/**
 * Removes a member whose Clerk account was deleted, with their pool offers. Their loans stay as history,
 * showing the name they last had.
 */
export const removeDeleted = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    // Convex builds tokenIdentifier as "<issuer>|<subject>", and Clerk's subject is the user id.
    const tokenIdentifier = `${process.env.CLERK_JWT_ISSUER_DOMAIN}|${clerkUserId}`
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique()
    if (!user) return null
    const offers = await ctx.db
      .query("pool")
      .withIndex("by_owner_card", (q) => q.eq("ownerId", user._id))
      .collect()
    for (const offer of offers) await ctx.db.delete(offer._id)
    await ctx.db.delete(user._id)
    return { name: user.name, offers: offers.length }
  },
})

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await ctx.db.patch(user._id, { name: cleanName(args.name) })
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
