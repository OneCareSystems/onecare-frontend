
import EmptyState from "./EmptyState.jsx";

const Table = ({
  columns = [],
  data = [],
  getRowKey,
  emptyTitle,
  emptyMessage,
  className = "",
}) => {
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-neutral-200 ${className}`}>
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
              key={getRowKey ? getRowKey(row) : row.id ?? rowIndex}
              className="hover:bg-neutral-50"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-neutral-700"
                >
                  {column.render
                    ? column.render(row)
                    : row[column.key] ?? "—"}
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
