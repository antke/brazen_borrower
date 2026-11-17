"use client"

import { labels } from "@/core/labels"
import { useAddPerson, usePeople } from "@/core/people"
import { Button } from "@/kits/keyframery/ui/button"
import { Card, CardContent } from "@/kits/keyframery/ui/card"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Input } from "@/kits/keyframery/ui/input"
import { ErrorAlert } from "./fields"
import { PageHeader } from "./shell"

export function PeoplePage() {
  const people = usePeople()
  const person = useAddPerson()

  return (
    <div className="flex max-w-md flex-col gap-6">
      <PageHeader title="People" />
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void person.submit()
        }}
      >
        <Field className="flex-1">
          <FieldLabel>{labels.personName}</FieldLabel>
          <Input value={person.name} onValueChange={person.setName} />
        </Field>
        <Button type="submit" variant="primary">
          {labels.addPerson}
        </Button>
      </form>
      <ErrorAlert message={person.error} />
      <Card>
        <CardContent>
          <ul aria-label={labels.people} className="divide-y">
            {people?.map((p) => (
              <li key={p._id} className="py-2 text-sm">
                {p.name}
              </li>
            ))}
            {people?.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nobody yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
