import type { ReactNode } from "react"

export type Column<Row> = { header: string; cell: (row: Row) => ReactNode; className?: string }

export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  empty,
}: {
  label: string
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  empty: string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table aria-label={label} className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className={`px-3 py-2 font-medium ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-neutral-600 dark:text-neutral-400">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.header} className={`px-3 py-2 align-top ${c.className ?? ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
