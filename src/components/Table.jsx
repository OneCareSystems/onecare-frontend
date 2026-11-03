import EmptyState from "./EmptyState.jsx";

/**
 * CFG-07 — wide tables scroll inside their own container (AC3, NFRU-004).
 * `overflow-x-auto` alone is not enough at 360 px: the scrollable region
 * must also be reachable and named for keyboard / screen-reader users
 * (SDS §2.4.10), so the wrapper is a labelled `region` with `tabIndex=0`.
 * The page itself never scrolls sideways because the overflow is contained
 * here.
 */
const Table = ({
  columns = [],
  data = [],
  getRowKey,
  emptyTitle,
  emptyMessage,
  label = "Data table",
  className = "",
}) => {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`w-full overflow-x-auto rounded-lg border border-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${className}`}
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="whitespace-nowrap px-4 py-3 font-semibold text-neutral-700"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-200">
          {data.map((row, rowIndex) => (
            <tr
              key={getRowKey ? getRowKey(row) : (row.id ?? rowIndex)}
              className="hover:bg-neutral-50"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-neutral-700"
                >
                  {column.render
                    ? column.render(row)
                    : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
