"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { createAgent, registerTools } from "@ui-sdk/react/agent"
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { useEffect, type ReactNode } from "react"
import { api } from "../../convex/_generated/api"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
const agent = createAgent()

/** Saves the signed-in Clerk user as a member, so they can own cards and be picked in loans. */
function StoreUser() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const store = useMutation(api.users.store)
  useEffect(() => {
    if (isAuthenticated) void store()
  }, [isAuthenticated, store, user?.id])
  return null
}

/** What every kit's root layout wraps its interface in, inside Clerk's provider. */
export function Providers({ children }: { children: ReactNode }) {
  // Nothing is marked data-agent-confirm, so there is nothing to ask the person about.
  useEffect(() => registerTools(agent, { allow: () => true }), [])
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <StoreUser />
      {children}
    </ConvexProviderWithClerk>
  )
}
