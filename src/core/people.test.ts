import { expect, test } from "vitest"
import { sameParty, toParty } from "./people"

const members = [
  { _id: "u1", name: "Antek" },
  { _id: "u2", name: "Bob" },
]

test("toParty: a picked id or a typed member name is that member; anything else is an outsider", () => {
  expect(toParty("u1", members)).toEqual({ userId: "u1" })
  expect(toParty("  antek ", members)).toEqual({ userId: "u1" })
  expect(toParty(" Uncle Joe ", members)).toEqual({ name: "Uncle Joe" })
})

test("sameParty catches lending to yourself, by pick or by typing your name", () => {
  expect(sameParty(toParty("u1", members), toParty("Antek", members))).toBe(true)
  expect(sameParty(toParty("u1", members), toParty("u2", members))).toBe(false)
  expect(sameParty(toParty("Joe", members), toParty("joe", members))).toBe(true)
  expect(sameParty(toParty("u1", members), toParty("Joe", members))).toBe(false)
})
