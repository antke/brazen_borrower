import { v } from "convex/values"
import { internal } from "./_generated/api"
import { action, internalMutation, query } from "./_generated/server"
import { currentUser } from "./lib/auth"
import { clerkDisplayName } from "./lib/clerk"

/**
 * Saves the signed-in Clerk user as a member, named after their Clerk username. Runs on every visit, so a
 * changed username shows up next time. Clerk's token for Convex carries no name, so it's looked up by id.
 */
export const store = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Sign in first")
    const key = process.env.CLERK_SECRET_KEY
    if (!key) throw new Error("CLERK_SECRET_KEY is not set on the Convex deployment")
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`Clerk user lookup failed: ${res.status}`)
    const name = clerkDisplayName(await res.json())
    await ctx.runMutation(internal.users.save, { tokenIdentifier: identity.tokenIdentifier, name })
  },
})

export const save = internalMutation({
  args: { tokenIdentifier: v.string(), name: v.string() },
  handler: async (ctx, { tokenIdentifier, name }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique()
    if (!user) return ctx.db.insert("users", { name, tokenIdentifier })
    if (user.name !== name) await ctx.db.patch(user._id, { name })
    return user._id
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
