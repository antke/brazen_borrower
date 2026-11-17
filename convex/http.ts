import { httpRouter } from "convex/server"
import { Webhook } from "svix"
import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"

const http = httpRouter()

/** Clerk calls this when an account changes; a deleted account takes its member and pool offers with it. */
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) return new Response("CLERK_WEBHOOK_SECRET is not set", { status: 500 })
    const payload = await request.text()
    try {
      // Throws unless Clerk signed this exact payload; it doesn't return the parsed event.
      new Webhook(secret).verify(payload, {
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      })
    } catch {
      return new Response("Invalid signature", { status: 400 })
    }
    const event = JSON.parse(payload) as { type: string; data: { id?: string } }
    if (event.type === "user.deleted" && event.data.id)
      await ctx.runMutation(internal.users.removeDeleted, { clerkUserId: event.data.id })
    return new Response(null, { status: 200 })
  }),
})

export default http
