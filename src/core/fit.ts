import { useSyncExternalStore } from "react"

/** A card's width over its height: portrait cards, and battlefields on their side. */
export const PORTRAIT = 744 / 1039
export const LANDSCAPE = 1039 / 744

/** Groups of cards laid side by side, all one height, each filling `rows` rows top to bottom and then its next column:
    the rows and card height (whole pixels) that show every card in `width` × `height` as large as they can be. `gap` is
    between cards, `groupGap` between groups; `ratio` is a group's card width over height, and `extra` any fixed width
    it takes besides (a panel's inner gaps). */
export function fitCards(
  groups: { count: number; ratio: number; extra?: number }[],
  width: number,
  height: number,
  gap: number,
  groupGap: number
) {
  let best = { rows: 1, cardHeight: 0 }
  const most = Math.max(1, ...groups.map((g) => g.count))
  for (let rows = 1; rows <= most; rows++) {
    const columns = groups.map((g) => Math.ceil(g.count / rows))
    const gaps =
      groups.reduce((sum, g, i) => sum + Math.max(0, columns[i] - 1) * gap + (g.extra ?? 0), 0) + Math.max(0, groups.length - 1) * groupGap
    const cardWidths = groups.reduce((sum, g, i) => sum + columns[i] * g.ratio, 0)
    const cardHeight = Math.floor(Math.min((height - (rows - 1) * gap) / rows, (width - gaps) / cardWidths))
    if (cardHeight > best.cardHeight) best = { rows, cardHeight }
  }
  return best
}

/** Groups of one-height lines laid side by side, each filling `rows` lines top to bottom and then its next column, every
    column one width: the fewest rows (so the most columns, using the width) that still leave a column `minWidth` wide,
    and never more than the `maxRows` the height holds. `gap` is between lines and columns, `groupGap` between groups,
    `extra` any fixed width a group takes besides. */
export function fitLines(groups: { count: number; extra?: number }[], width: number, maxRows: number, gap: number, groupGap: number, minWidth: number) {
  const at = (rows: number) => {
    const columns = groups.map((g) => Math.ceil(g.count / rows))
    const gaps =
      groups.reduce((sum, g, i) => sum + Math.max(0, columns[i] - 1) * gap + (g.extra ?? 0), 0) + Math.max(0, groups.length - 1) * groupGap
    return { rows, columnWidth: Math.floor((width - gaps) / columns.reduce((sum, c) => sum + c, 0)) }
  }
  const most = Math.max(1, Math.min(maxRows, Math.max(...groups.map((g) => g.count))))
  for (let rows = 1; rows < most; rows++) {
    const fit = at(rows)
    if (fit.columnWidth >= minWidth) return fit
  }
  return at(most)
}

/** Whether the window is at least `minWidth` pixels wide, kept up to date; false on the server and without matchMedia. */
export function useMinWidth(minWidth: number) {
  const query = `(min-width: ${minWidth}px)`
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {}
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false
  )
}
