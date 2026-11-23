/** Something the member just did, said back to them briefly. The hooks that change things say it here; the kit
    listens and shows it (as a toast), so core never imports the kit. */
export type Notice = { title: string; description?: string }

const listeners = new Set<(notice: Notice) => void>()

export function notify(notice: Notice) {
  for (const listener of listeners) listener(notice)
}

/** Hears every notice from now on; returns the call that stops it. */
export function onNotice(listener: (notice: Notice) => void) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** Cards in a notice: one card by name ("XYZ ×5", or "XYZ" for one copy), several as a count ("4 cards"). */
export function cardsPhrase(items: { name: string; quantity: number }[]) {
  if (items.length !== 1) return `${items.length} cards`
  const [{ name, quantity }] = items
  return quantity > 1 ? `${name} ×${quantity}` : name
}
