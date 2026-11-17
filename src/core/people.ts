import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { errorMessage } from "./format"

export function usePeople() {
  return useQuery(api.people.list)
}

export function usePeopleOptions() {
  return usePeople()?.map((p) => ({ value: p._id as string, label: p.name })) ?? []
}

export function useAddPerson() {
  const add = useMutation(api.people.add)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  async function submit() {
    try {
      await add({ name })
      setName("")
      setError("")
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return { name, setName, error, submit }
}
