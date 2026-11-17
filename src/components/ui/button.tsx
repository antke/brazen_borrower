import { Button as UiButton } from "@ui-sdk/react/button"
import type { ComponentProps } from "react"
import { focusRing } from "./styles"

const variants = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300",
  secondary: "border border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800",
  ghost: "hover:bg-neutral-100 dark:hover:bg-neutral-800",
}

export const buttonClass = (variant: keyof typeof variants = "primary") =>
  `inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium disabled:opacity-50 ${focusRing} ${variants[variant]}`

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof UiButton> & { variant?: keyof typeof variants }) {
  return (
    <UiButton
      className={`${buttonClass(variant)} ${className}`}
      {...props}
    />
  )
}
