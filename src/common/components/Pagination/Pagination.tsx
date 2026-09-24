import { Button } from '../Button/Button.tsx';
import styles from './Pagination.module.css';
import { totalPages } from '../../utils/pagination.ts';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Plural de lo que se lista: "registros", "eventos". */
  itemLabel: string;
  onPageChange: (page: number) => void;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  itemLabel,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const pages = totalPages(total, pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <p role="status">
        Mostrando {from}–{to} de {total} {itemLabel}
      </p>
      <div className={styles.controls}>
        {pageSizeOptions && onPageSizeChange && (
          <label className={styles.size}>
            Por página
            <select
              value={pageSize}
              onChange={(event) => {
                onPageSizeChange(Number(event.target.value));
              }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          variant="quiet"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          Anterior
        </Button>
        <span className={styles.page}>
          Página {page} de {pages}
        </span>
        <Button
          variant="quiet"
          size="sm"
          disabled={page >= pages}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
