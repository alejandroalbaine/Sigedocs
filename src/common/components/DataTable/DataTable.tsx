import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export type SortDirection = 'asc' | 'desc';

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  sortable?: boolean;
}

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface DataTableProps<Row> {
  caption: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  emptyMessage: string;
  minWidth?: number;
  sort?: SortState;
  onSort?: (key: string) => void;
}

function ariaSort(column: string, sort: SortState | undefined) {
  if (sort?.key !== column) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyMessage,
  minWidth,
  sort,
  onSort,
}: DataTableProps<Row>) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table} style={minWidth ? { minWidth } : undefined}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) =>
              column.sortable && onSort ? (
                <th key={column.key} scope="col" aria-sort={ariaSort(column.key, sort)}>
                  <button
                    type="button"
                    className={styles.sort}
                    onClick={() => {
                      onSort(column.key);
                    }}
                  >
                    {column.header}
                    <span aria-hidden="true">
                      {sort?.key === column.key ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              ) : (
                <th key={column.key} scope="col">
                  {column.header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={styles.empty} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
