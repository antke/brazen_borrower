import { Field, FieldLabel } from "@ui-sdk/react/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { control, label as labelClass, option, popup } from "./styles"

export type Option = { value: string; label: string }

export function SelectField({
  label,
  items,
  value,
  onValueChange,
  placeholder = "Choose…",
  className = "",
}: {
  label: string
  items: Option[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  className?: string
}) {
  return (
    <Field className={`flex flex-col gap-1.5 ${className}`}>
      <FieldLabel className={labelClass}>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange} placeholder={placeholder}>
        <SelectTrigger
          className={`${control} inline-flex w-full items-center justify-between gap-2 data-placeholder:text-neutral-600 dark:data-placeholder:text-neutral-400`}
        >
          <SelectValue />
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </SelectTrigger>
        <SelectContent className={popup}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className={option}>
              {item.label}
              <SelectItemIndicator>
                <CheckIcon aria-hidden="true" className="size-4" />
              </SelectItemIndicator>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
