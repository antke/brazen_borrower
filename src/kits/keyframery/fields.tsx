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
import { Badge, Roll } from "@/kits/keyframery/ui/badge"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/kits/keyframery/ui/empty"
import { Field, FieldLabel } from "@/kits/keyframery/ui/field"
import { Item, ItemContent, ItemDescription } from "@/kits/keyframery/ui/item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "@/kits/keyframery/ui/select"
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

/** Pick one of a list of names, or "Anyone" (the empty value). */
export function PersonSelect({
  label,
  names,
  value,
  onValueChange,
}: {
  label: string
  names: string[]
  value: string
  onValueChange: (name: string) => void
}) {
  const show = (name: string) => name || "Anyone"
  return (
    <Select<string> value={value} onValueChange={(name) => onValueChange(name ?? "")} itemToLabel={show}>
      {/* No gap: the select's label brings its own space, which lines the field up with a text field beside it. */}
      <div className="flex flex-col">
        <SelectLabel>{label}</SelectLabel>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </div>
      <SelectContent>
        <SelectList>
          {["", ...names].map((name) => (
            <SelectItem key={show(name)} value={name} label={show(name)}>
              <SelectItemText>{show(name)}</SelectItemText>
              <SelectItemIndicator />
            </SelectItem>
          ))}
        </SelectList>
      </SelectContent>
    </Select>
  )
}

export function Copies({
  label,
  hideLabel = false,
  value,
  onValueChange,
  min = 1,
  max = 99,
}: {
  label: string
  hideLabel?: boolean
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    // Two digits never need more room; a stepper stretched to its column reads as a slider. A phone gets a narrower one.
    <Field className="w-28 shrink-0 sm:w-32">
      {/* w-px: the kit label's w-fit otherwise beats sr-only's 1px, and the hidden text widens its container. */}
      <FieldLabel className={hideLabel ? "sr-only w-px" : undefined}>{label}</FieldLabel>
      <NumberInput value={value} onValueChange={(v) => v !== null && onValueChange(v)} min={min} max={max}>
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

/** A quiet one-line "nothing here" for a list inside a card; EmptyState is for a whole page. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Item variant="muted" size="sm">
      <ItemContent>
        <ItemDescription>{children}</ItemDescription>
      </ItemContent>
    </Item>
  )
}

export function EmptyState({ title, media, children }: { title: string; media?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Empty>
      <EmptyHeader>
        {media && <EmptyMedia>{media}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      {children}
    </Empty>
  )
}

/** A number that rolls digit by digit when the record changes under it. */
export function Count({ value }: { value: number }) {
  return (
    <>
      <Roll text={String(value)} />
      <span className="sr-only">{value}</span>
    </>
  )
}

/** Copies someone could borrow right now: lit when there are some, quiet when every copy is out. */
export function Available({ value }: { value: number }) {
  return <Badge variant={value > 0 ? "default" : "outline"} count={value} />
}
