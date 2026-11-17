"use client"

import { Alert, AlertDescription } from "@/kits/keyframery/ui/alert"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxList,
} from "@/kits/keyframery/ui/combobox"
import { Empty, EmptyHeader, EmptyTitle } from "@/kits/keyframery/ui/empty"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@/kits/keyframery/ui/number-input"

/** Pick a member, or type anyone else's name: the value is the member's id or the typed text. */
export function PartyField({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string | null
  onValueChange: (value: string | null) => void
}) {
  return (
    <Combobox
      allowCustomValue
      value={value}
      onValueChange={(next) => onValueChange(next as string | null)}
      itemToLabel={(v) => options.find((o) => o.value === v)?.label ?? String(v)}
    >
      <div className="flex flex-col gap-1.5">
        <ComboboxLabel>{label}</ComboboxLabel>
        <ComboboxInput placeholder="A member, or type any name" />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>
          {(state) => (state.query.trim() ? `Press Enter to use “${state.query.trim()}”` : "No members yet: type a name")}
        </ComboboxEmpty>
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem key={option.value} value={option.value} label={option.label}>
              {option.label}
              <ComboboxItemIndicator />
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function Copies({
  label,
  hideLabel = false,
  value,
  onValueChange,
}: {
  label: string
  hideLabel?: boolean
  value: number
  onValueChange: (value: number) => void
}) {
  return (
    <Field>
      <FieldLabel className={hideLabel ? "sr-only" : undefined}>{label}</FieldLabel>
      <NumberInput value={value} onValueChange={(v) => v !== null && onValueChange(v)} min={1} max={99}>
        <NumberInputGroup>
          <NumberInputDecrement aria-label={`Decrease ${label}`} />
          <NumberInputControl />
          <NumberInputIncrement aria-label={`Increase ${label}`} />
        </NumberInputGroup>
      </NumberInput>
    </Field>
  )
}

export function ErrorAlert({ message }: { message: string }) {
  return message ? (
    <Alert role="alert" variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      {children}
    </Empty>
  )
}
