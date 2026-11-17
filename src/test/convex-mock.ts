import { getFunctionName, type FunctionReference } from "convex/server"
import { vi } from "vitest"

export const members = [
  { _id: "u1", name: "Alice" },
  { _id: "u2", name: "Bob" },
]
const card = (id: string, name: string, number: string) => ({
  _id: id, _creationTime: 1, printingId: id, name, set: "OGN", number, rarity: "Rare",
  imageUrl: `https://cmsassets.rgpub.io/sanity/images/x/${id}.png`,
})
export const catalogue = [card("c1", "Blazing Scorcher", "001"), card("c2", "Pouty Poro", "013"), card("c3", "Fury Rune", "007")]

/** Who the tests are signed in as; null is signed out. */
export const session: { me: (typeof members)[number] | null } = { me: members[0] }

export const queries: Record<string, unknown> = {
  "users:list": members,
  "catalog:list": catalogue,
  "loans:list": [],
  "loans:mine": [],
  "pool:list": [],
  "pool:mine": [],
}
export const mutations: Record<string, ReturnType<typeof vi.fn>> = {}

export function convexReactMock() {
  return {
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: session.me !== null }),
    useQuery: (ref: FunctionReference<"query">, args?: unknown) => {
      if (args === "skip") return undefined
      const name = getFunctionName(ref)
      return name === "users:me" ? session.me : queries[name]
    },
    useMutation: (ref: FunctionReference<"mutation">) => {
      const name = getFunctionName(ref)
      return (mutations[name] ??= vi.fn(async () => undefined))
    },
  }
}
