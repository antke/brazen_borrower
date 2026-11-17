import { getFunctionName, type FunctionReference } from "convex/server"
import { vi } from "vitest"

export const people = [
  { _id: "p1", _creationTime: 1, name: "Alice" },
  { _id: "p2", _creationTime: 1, name: "Bob" },
]
const card = (id: string, name: string, number: string) => ({
  _id: id, _creationTime: 1, printingId: id, name, set: "OGN", number, rarity: "Rare",
  imageUrl: `https://cmsassets.rgpub.io/sanity/images/x/${id}.png`,
})
export const catalogue = [card("c1", "Blazing Scorcher", "001"), card("c2", "Pouty Poro", "013"), card("c3", "Fury Rune", "007")]

export const queries: Record<string, unknown> = {
  "people:list": people,
  "catalog:list": catalogue,
  "loans:list": [],
  "pool:list": [],
}
export const mutations: Record<string, ReturnType<typeof vi.fn>> = {}

export function convexReactMock() {
  return {
    useQuery: (ref: FunctionReference<"query">) => queries[getFunctionName(ref)],
    useMutation: (ref: FunctionReference<"mutation">) => {
      const name = getFunctionName(ref)
      return (mutations[name] ??= vi.fn(async () => undefined))
    },
  }
}
