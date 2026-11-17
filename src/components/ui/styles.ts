// Shared looks for the wrappers; swapping kits (SPEC-01, Keyframery) means replacing src/components/ui only.
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-neutral-100"
export const control = `h-9 rounded-lg border border-neutral-500 bg-transparent px-3 text-sm ${focusRing}`
export const label = "text-sm font-medium"
export const popup =
  "min-w-(--anchor-width) max-h-(--available-height) overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-md dark:border-neutral-800 dark:bg-neutral-900"
export const option =
  "flex cursor-default items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-neutral-100 dark:data-highlighted:bg-neutral-800"
