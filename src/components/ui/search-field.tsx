import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@ui-sdk/react/combobox"
import { useState, type ReactNode } from "react"
import { control, label as labelClass, option, popup } from "./styles"
import type { Option } from "./select-field"

/** Type to search `items`, pick a result to hand it to `onPick`; the field then clears for the next search. */
export function SearchField<T extends Option>({
  label,
  items,
  search,
  onPick,
  renderItem = (item) => item.label,
  placeholder,
  className = "",
}: {
  label: string
  items: T[]
  search: (items: T[], query: string) => T[]
  onPick: (item: T) => void
  renderItem?: (item: T) => ReactNode
  placeholder?: string
  className?: string
}) {
  const [query, setQuery] = useState("")
  const results = query.trim() ? search(items, query) : []

  return (
    <Combobox
      value={null}
      onValueChange={(value) => {
        // Looked up in all items: the combobox can clear the query before it reports the pick.
        const item = items.find((i) => i.value === value)
        if (item) onPick(item)
        setQuery("")
      }}
      query={query}
      onQueryChange={setQuery}
      filter={false}
    >
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <ComboboxLabel className={labelClass}>{label}</ComboboxLabel>
        <ComboboxInput className={`${control} w-full`} placeholder={placeholder} />
      </div>
      <ComboboxContent className={popup}>
        <ComboboxEmpty className="px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          {query.trim() ? "No matches" : "Start typing to search"}
        </ComboboxEmpty>
        <ComboboxList>
          {results.map((item) => (
            <ComboboxItem key={item.value} value={item.value} label={item.label} className={option}>
              {renderItem(item)}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
