import { expect, test } from "vitest"
import { cleanName, sameParty } from "./parties"

test("cleanName trims, collapses spaces and enforces 1 to 40 characters", () => {
  expect(cleanName("  Uncle   Joe ")).toBe("Uncle Joe")
  expect(() => cleanName("   ")).toThrow()
  expect(() => cleanName("x".repeat(41))).toThrow()
})

test("sameParty compares members by id and outsiders by name", () => {
  expect(sameParty({ userId: "a", name: "Ann" }, { userId: "a", name: "Ann B" })).toBe(true)
  expect(sameParty({ userId: "a", name: "Ann" }, { userId: "b", name: "Ann" })).toBe(false)
  expect(sameParty({ userId: "a", name: "Ann" }, { name: "Ann" })).toBe(false)
  expect(sameParty({ name: "Joe" }, { name: "joe" })).toBe(true)
  expect(sameParty({ name: "Joe" }, { name: "Jo" })).toBe(false)
})
