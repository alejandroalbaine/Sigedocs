import styles from './documental.module.css';

interface DossierPagerProps {
  count: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

/** El contrato pagina por cursor y no informa el total: solo hay anterior/siguiente. */
export function DossierPager({
  count,
  page,
  pageSize,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
}: DossierPagerProps) {
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + count;
  return (
    <nav className={styles.pager} aria-label="Paginación">
      <span role="status">
        Mostrando{' '}
        <strong>
          {from}–{to}
        </strong>{' '}
        expedientes
      </span>
      <span className={styles.pages}>
        <button
          type="button"
          className={styles.pageButton}
          disabled={!hasPrevious}
          aria-label="Página anterior"
          onClick={onPrevious}
        >
          ‹
        </button>
        <button type="button" className={`${styles.pageButton} ${styles.pageButtonActive}`}>
          {page}
        </button>
        <button
          type="button"
          className={styles.pageButton}
          disabled={!hasNext}
          aria-label="Página siguiente"
          onClick={onNext}
        >
          ›
        </button>
      </span>
    </nav>
  );
}
