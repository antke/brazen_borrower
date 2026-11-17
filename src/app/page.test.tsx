import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { getFunctionName, type FunctionReference } from "convex/server"
import { beforeEach, expect, test, vi } from "vitest"
import Home from "./page"

const mutations = vi.hoisted(() => ({
  "tasks:add": vi.fn(),
  "tasks:setStatus": vi.fn(),
}))

vi.mock("convex/react", () => ({
  useQuery: () => [
    { _id: "t1", _creationTime: 1, text: "Buy milk", status: "todo" },
    { _id: "t2", _creationTime: 2, text: "Walk dog", status: "doing" },
  ],
  useMutation: (ref: FunctionReference<"mutation">) => {
    const fn = mutations[getFunctionName(ref) as keyof typeof mutations]
    return Object.assign(fn, { withOptimisticUpdate: () => fn })
  },
}))

const agent = createAgent()

beforeEach(() => {
  mutations["tasks:add"].mockReset()
  mutations["tasks:setStatus"].mockReset()
})

test("an agent can find every control, add a task and change a status", async () => {
  render(<Home />)

  const components = agent
    .snapshot()
    .filter((entry) => !entry.offPage && entry.component !== "more")
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  }
  const labels = components.map((entry) => entry.label)
  for (const label of ["New task", "Add task", "Status of Buy milk", "Status of Walk dog"]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }

  const result = await agent.act({
    steps: [
      { ref: "New task", action: "setValue", args: ["Ship it"] },
      { ref: "Add task", action: "press" },
      { ref: "Status of Buy milk", action: "setValue", args: ["Done"] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(mutations["tasks:add"]).toHaveBeenCalledWith({ text: "Ship it" })
  expect(mutations["tasks:setStatus"]).toHaveBeenCalledWith({ id: "t1", status: "done" })
})

test("a person adds a task with Enter, and an empty one is ignored", async () => {
  const user = userEvent.setup()
  render(<Home />)
  const input = screen.getByLabelText<HTMLInputElement>("New task")

  await user.click(screen.getByRole("button", { name: "Add task" }))
  expect(mutations["tasks:add"]).not.toHaveBeenCalled()

  await user.type(input, "  Water plants {Enter}")
  expect(mutations["tasks:add"]).toHaveBeenCalledWith({ text: "Water plants" })
  expect(input.value).toBe("")
})

test("a person changes a status from the keyboard", async () => {
  const user = userEvent.setup()
  render(<Home />)
  const trigger = screen.getByRole("combobox", { name: "Status of Walk dog" })
  expect(trigger.textContent).toContain("Doing")

  trigger.focus()
  await user.keyboard("{Enter}")
  await user.click(await screen.findByRole("option", { name: "Done" }))
  expect(mutations["tasks:setStatus"]).toHaveBeenCalledWith({ id: "t2", status: "done" })
})
