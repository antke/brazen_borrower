"use client"

import { Alert, AlertDescription } from "@/kits/keyframery/ui/alert"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@/kits/keyframery/ui/number-input"
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from "@/kits/keyframery/ui/select"

export function OptionSelect({
  label,
  items,
  value,
  onValueChange,
}: {
  label: string
  items: { value: string; label: string }[]
  value: string | null
  onValueChange: (value: string | null) => void
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange} placeholder="Choose…">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
              <SelectItemIndicator />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
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
