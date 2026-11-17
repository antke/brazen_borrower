"use client"

import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { errorMessage } from "@/components/people"
import { Button } from "@/components/ui/button"
import { TextField } from "@/components/ui/text-field"

export default function PeoplePage() {
  const people = useQuery(api.people.list)
  const add = useMutation(api.people.add)
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">People</h1>
      <form
        className="flex items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await add({ name })
            setName("")
            setError("")
          } catch (err) {
            setError(errorMessage(err))
          }
        }}
      >
        <TextField label="Name" value={name} onValueChange={setName} className="flex-1" />
        <Button type="submit">Add person</Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {people?.map((p) => (
          <li key={p._id} className="px-3 py-2 text-sm">
            {p.name}
          </li>
        ))}
        {people?.length === 0 && <li className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">Nobody yet.</li>}
      </ul>
    </div>
  )
}
