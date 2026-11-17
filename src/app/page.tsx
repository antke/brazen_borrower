"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Button } from "@ui-sdk/react/button"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { api } from "../../convex/_generated/api"
import type { Doc } from "../../convex/_generated/dataModel"

type Status = Doc<"tasks">["status"]

const statuses: { value: Status; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
]

export default function Home() {
  const tasks = useQuery(api.tasks.list)
  const add = useMutation(api.tasks.add)
  const setStatus = useMutation(api.tasks.setStatus).withOptimisticUpdate(
    (store, { id, status }) => {
      const current = store.getQuery(api.tasks.list, {})
      if (current)
        store.setQuery(
          api.tasks.list,
          {},
          current.map((t) => (t._id === id ? { ...t, status } : t))
        )
    }
  )
  const [text, setText] = useState("")

  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h1 className="text-lg font-semibold">Tasks</h1>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!text.trim()) return
              void add({ text: text.trim() })
              setText("")
            }}
          >
            <Field className="flex flex-1 flex-col gap-1.5">
              <FieldLabel className="text-sm font-medium">New task</FieldLabel>
              <Input
                className="h-9 w-full rounded-lg border border-neutral-500 bg-transparent px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-neutral-100"
                value={text}
                onValueChange={setText}
              />
            </Field>
            <Button type="submit" className="inline-flex h-9 items-center rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 dark:focus-visible:outline-neutral-100">
              Add task
            </Button>
          </form>
          <ul className="flex flex-col gap-2">
            {tasks?.map((t) => (
              <li key={t._id} className="flex items-center justify-between gap-2">
                <span>{t.text}</span>
                <Select
                  value={t.status}
                  onValueChange={(status) =>
                    status && void setStatus({ id: t._id, status })
                  }
                >
                  <SelectTrigger
                    aria-label={`Status of ${t.text}`}
                    className="inline-flex h-8 w-28 items-center justify-between rounded-lg border border-neutral-500 px-2.5 text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 data-open:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:outline-neutral-100 dark:data-open:bg-neutral-800"
                  >
                    <SelectValue />
                    <ChevronDownIcon className="size-4" />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--anchor-width) rounded-lg border border-neutral-200 bg-white p-1 shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                    {statuses.map((s) => (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        className="flex cursor-default items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-neutral-100 dark:data-highlighted:bg-neutral-800"
                      >
                        {s.label}
                        <SelectItemIndicator>
                          <CheckIcon className="size-4" />
                        </SelectItemIndicator>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
      </section>
    </main>
  )
}
