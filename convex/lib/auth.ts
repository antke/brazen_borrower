import type { QueryCtx } from "../_generated/server"

/** The signed-in member, or null when signed out or not stored yet. */
export async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique()
}

export async function requireUser(ctx: QueryCtx) {
  const user = await currentUser(ctx)
  if (!user) throw new Error("Sign in first")
  return user
}
