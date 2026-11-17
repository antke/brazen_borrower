"use client"

import { createAgent, registerTools } from "@ui-sdk/react/agent"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useEffect, type ReactNode } from "react"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
const agent = createAgent()

/** What every kit's root layout wraps its interface in: the database client and the agent bridge. */
export function Providers({ children }: { children: ReactNode }) {
  // Nothing is marked data-agent-confirm, so there is nothing to ask the person about.
  useEffect(() => registerTools(agent, { allow: () => true }), [])
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
