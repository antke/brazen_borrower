import { expect, test } from "vitest"
import { clerkDisplayName } from "./clerk"

test("a member is shown by username, then first name, never by email", () => {
  expect(clerkDisplayName({ username: " antek ", first_name: "Antoni" })).toBe("antek")
  expect(clerkDisplayName({ username: null, first_name: "Antoni" })).toBe("Antoni")
  expect(clerkDisplayName({ username: "", first_name: "  " })).toBe("Member")
  expect(clerkDisplayName({ username: "x".repeat(60) })).toHaveLength(40)
})
