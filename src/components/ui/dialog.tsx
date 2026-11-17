import {
  Dialog as UiDialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/react/dialog"
import { XIcon } from "lucide-react"
import type { ReactNode } from "react"
import { buttonClass } from "./button"
import { focusRing } from "./styles"

export function Dialog({
  triggerLabel,
  title,
  open,
  onOpenChange,
  children,
}: {
  triggerLabel: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className={buttonClass()}>{triggerLabel}</DialogTrigger>
      <DialogContent className="fixed inset-0 m-auto flex h-fit max-h-[90dvh] w-[min(36rem,calc(100%-2rem))] flex-col gap-4 overflow-auto rounded-xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogClose aria-label="Close" className={`grid size-8 place-items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 ${focusRing}`}>
            <XIcon aria-hidden="true" className="size-4" />
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </UiDialog>
  )
}
