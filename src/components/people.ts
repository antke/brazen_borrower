"use client"

import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

export function usePeopleOptions() {
  return useQuery(api.people.list)?.map((p) => ({ value: p._id, label: p.name })) ?? []
}

export const errorMessage = (e: unknown) =>
  // Convex prefixes server errors with request details; the thrown message is the last line.
  e instanceof Error ? e.message.split("\n").find((l) => l.startsWith("Uncaught Error: "))?.slice(16) ?? e.message : String(e)
