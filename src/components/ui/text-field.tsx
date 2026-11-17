import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import type { ComponentProps } from "react"
import { control, label as labelClass } from "./styles"

export function TextField({
  label,
  className = "",
  ...props
}: { label: string } & ComponentProps<typeof Input>) {
  return (
    <Field className={`flex flex-col gap-1.5 ${className}`}>
      <FieldLabel className={labelClass}>{label}</FieldLabel>
      <Input className={`${control} w-full`} {...props} />
    </Field>
  )
}
