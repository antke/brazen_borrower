import { describe, expect, test } from "vitest"
import { LANDSCAPE, PORTRAIT, fitCards, fitLines } from "./fit"

describe("fitLines", () => {
  test("lines spread over as many columns as stay wide enough, within the rows the height holds", () => {
    // A lead column, an 18-line main deck and a 9-line sideboard across 1400px: columns of at least 240px.
    const groups = [{ count: 1 }, { count: 18, extra: 24 }, { count: 9, extra: 24 }]
    // 6 rows would want 6 columns of 216px; 9 rows give 4 of 328px.
    expect(fitLines(groups, 1400, 9, 8, 16, 240)).toEqual({ rows: 9, columnWidth: 328 })
    // Wider, 5 rows leave room for 4 main deck columns.
    expect(fitLines(groups, 1880, 9, 8, 16, 240)).toEqual({ rows: 5, columnWidth: 252 })
    // Too little height for 6 rows: as many as it holds, the columns narrower.
    expect(fitLines(groups, 1400, 4, 8, 16, 240).rows).toBe(4)
    // Plenty of width: fewer rows still, never more columns than lines.
    expect(fitLines([{ count: 3 }], 2000, 9, 8, 16, 240)).toEqual({ rows: 1, columnWidth: 661 })
  })
})

describe("fitCards", () => {
  test("a short wide space takes one row; a tall narrow one stacks the cards", () => {
    expect(fitCards([{ count: 4, ratio: 1 }], 400, 100, 0, 0)).toEqual({ rows: 1, cardHeight: 100 })
    expect(fitCards([{ count: 4, ratio: 1 }], 100, 400, 0, 0)).toEqual({ rows: 4, cardHeight: 100 })
  })

  test("a lone card stops at the largest height, in one row", () => {
    expect(fitCards([{ count: 2, ratio: 1 }], 2000, 2000, 0, 0, 300)).toEqual({ rows: 1, cardHeight: 300 })
  })

  test("a whole deck fits a laptop's window, every card counted with the gaps between them", () => {
    const groups = [
      { count: 4, ratio: PORTRAIT },
      { count: 3, ratio: LANDSCAPE },
      { count: 17, ratio: PORTRAIT },
      { count: 9, ratio: PORTRAIT },
    ]
    const [width, height, gap, groupGap] = [1400, 650, 8, 24]
    const { rows, cardHeight } = fitCards(groups, width, height, gap, groupGap)
    const columns = groups.map((g) => Math.ceil(g.count / rows))
    const used =
      groups.reduce((sum, g, i) => sum + columns[i] * cardHeight * g.ratio + (columns[i] - 1) * gap, 0) + (groups.length - 1) * groupGap
    expect(used).toBeLessThanOrEqual(width)
    expect(rows * cardHeight + (rows - 1) * gap).toBeLessThanOrEqual(height)
    // Big enough to read: well past the builder's small stamps.
    expect(cardHeight).toBeGreaterThan(150)
  })
})
