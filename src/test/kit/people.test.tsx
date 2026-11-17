import { render } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { describe, expect, test, vi } from "vitest"
import { labels } from "@/core/labels"
import { mutations } from "@/test/convex-mock"
import { kitCases } from "./kits"

vi.mock("convex/react", async () => (await import("@/test/convex-mock")).convexReactMock())

const agent = createAgent()

describe.each(kitCases)("%s kit: people", (_, { PeoplePage }) => {
  test("an agent adds a person", async () => {
    render(<PeoplePage />)
    const result = await agent.act({
      steps: [
        { ref: labels.personName, action: "setValue", args: ["Cara"] },
        { ref: labels.addPerson, action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)
    expect(mutations["people:add"]).toHaveBeenCalledWith({ name: "Cara" })
  })
})
