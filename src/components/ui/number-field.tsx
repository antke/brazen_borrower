import { Field, FieldLabel } from "@ui-sdk/react/field"
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input"
import { MinusIcon, PlusIcon } from "lucide-react"
import { focusRing, label as labelClass } from "./styles"

const step = `grid size-9 place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800 ${focusRing}`

export function NumberField({
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
    <Field className="flex flex-col gap-1.5">
      <FieldLabel className={hideLabel ? "sr-only" : labelClass}>{label}</FieldLabel>
      <NumberInput value={value} onValueChange={(v) => v !== null && onValueChange(v)} min={min} max={max}>
        <NumberInputGroup className="inline-flex h-9 w-fit overflow-hidden rounded-lg border border-neutral-500">
          <NumberInputDecrement aria-label={`Decrease ${label}`} className={step}>
            <MinusIcon aria-hidden="true" className="size-4" />
          </NumberInputDecrement>
          <NumberInputControl className={`w-12 bg-transparent text-center text-sm ${focusRing}`} />
          <NumberInputIncrement aria-label={`Increase ${label}`} className={step}>
            <PlusIcon aria-hidden="true" className="size-4" />
          </NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>
    </Field>
  )
}
