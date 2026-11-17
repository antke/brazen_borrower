"use client"

import { createAgent, registerTools } from "@ui-sdk/react/agent"
import { useEffect } from "react"

const agent = createAgent()

export function AgentBridge() {
  // Nothing on the page is marked data-agent-confirm, so there is nothing to ask the person about.
  useEffect(() => registerTools(agent, { allow: () => true }), [])
  return null
}
