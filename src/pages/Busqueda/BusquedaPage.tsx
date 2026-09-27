import { useMemo, useState, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Download, FileSearch, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from '../documental/documental.module.css';

export function BusquedaPage() {
  const [params, setParams] = useSearchParams();
  const currentQuery = params.get('q') ?? '';
  const [term, setTerm] = useState(currentQuery);
  const query = useMemo(
    () => (currentQuery ? `&search=${encodeURIComponent(currentQuery)}` : ''),
    [currentQuery],
  );
  const { items, loading, error } = useDossiers(query);

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = term.trim();
    setParams(value ? { q: value } : {});
  }

  return (
    <div className={styles.page}>
      <title>Búsqueda avanzada | SIGESDOC</title>
      <header className={styles.searchHeader}>
        <div>
          <p className={`${styles.eyebrow} ${styles.eyebrowOrange}`}>
            SIGESDOC &nbsp; › &nbsp; Módulo de consulta &nbsp; › &nbsp; Búsqueda avanzada
          </p>
          <h1>Búsqueda Avanzada y Recuperación de Expedientes</h1>
          <p>
            Localización exhaustiva en el fondo documental de la UAPA conforme a la Ley General de
            Archivos 481-08 y el Cuadro General de Clasificación.
          </p>
        </div>
        <form className={styles.headerActions} onSubmit={submit}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonQuiet}`}
            onClick={() => {
              setTerm('');
              setParams({});
            }}
          >
            <X size={16} /> Limpiar filtros
          </button>
          <button className={`${styles.button} ${styles.buttonOrange}`}>
            <Search size={16} /> Ejecutar Búsqueda Booleana <kbd>Ctrl+Enter</kbd>
          </button>
        </form>
      </header>

      <details className={styles.filterBar}>
        <summary>
          <span className={styles.summaryIcon}>
            <SlidersHorizontal size={18} />
          </span>
          <h2>Filtros Avanzados</h2>
          <span className={styles.badgeWarning}>4 activos</span>
          <span className={styles.subtle}>• Metadatos TRD, Nivel de Reserva y Fechas</span>
        </summary>
        <form className={styles.filters} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="q">Texto</label>
            <input
              id="q"
              className={styles.input}
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
              }}
              placeholder="Código, título o asignatura"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="level">Nivel académico</label>
            <select
              id="level"
              className={styles.select}
              disabled
              title="Filtro pendiente en backend"
            >
              <option>Todos</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="state">Estado</label>
            <select
              id="state"
              className={styles.select}
              disabled
              title="Filtro pendiente en backend"
            >
              <option>Todos</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>&nbsp;</label>
            <button className={styles.button}>Aplicar consulta</button>
          </div>
        </form>
      </details>

      {error && <div className={styles.error}>{error}</div>}
      <section className={styles.summaryBar}>
        <div className={styles.summaryText}>
          <span className={styles.summaryIcon}>
            <FileSearch size={18} />
          </span>
          <div>
            <h2>
              {loading ? (
                'Ejecutando búsqueda…'
              ) : (
                <>
                  Se encontraron <span className={styles.eyebrowOrange}>{items.length}</span>{' '}
                  expedientes
                  <br />
                  coincidentes con los criterios
                </>
              )}
            </h2>
            <span className={styles.subtle}>
              Tiempo de respuesta del motor documental · datos según alcance autorizado
            </span>
          </div>
        </div>
        <div className={styles.resultActions}>
          <span className={styles.buttonSecondary}>
            <List size={16} /> Lista Detallada
          </span>
          <button className={styles.button} disabled title="Pendiente de ruta en backend">
            <Download size={16} /> Exportar Hallazgos (CSV / PDF)
          </button>
        </div>
      </section>

      <section className={styles.cards} aria-label="Resultados de búsqueda">
        {!loading && items.length === 0 && (
          <p className={styles.empty}>No se encontraron expedientes.</p>
        )}
        {items.slice(0, 3).map((item, index) => (
          <details
            className={`${styles.result} ${index === 1 ? styles.resultWarning : ''}`}
            key={item.dossierId}
          >
            <summary>
              <span className={styles.code}>{item.code}</span>
              <strong>{item.title}</strong>
              <span className={styles.badge}>{item.schoolCode}</span>
              <span
                className={index === 1 ? `${styles.badge} ${styles.badgeWarning}` : styles.badge}
              >
                {item.currentState.name}
              </span>
              <span className={styles.subtle}>
                {item.currentVersion.label} &nbsp; • &nbsp; expediente digital
              </span>
            </summary>
            <div className={styles.resultBody}>
              <p>
                {item.schoolCode} · {item.degreeProgramCode} · {item.subjectCode}
              </p>
              <div className={styles.resultActions}>
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  disabled
                  title="El backend aún no expone folios"
                >
                  Ver folio
                </button>
                <Link className={styles.button} to={`/revision?dossierId=${item.dossierId}`}>
                  Abrir expediente
                </Link>
              </div>
            </div>
          </details>
        ))}
      </section>

      <div className={styles.pager}>
        <span>
          Mostrando <strong>1 - {Math.min(3, items.length)}</strong> de{' '}
          <strong>{items.length}</strong> expedientes
        </span>
        <span className={styles.pages}>
          <button className={styles.pageButton} disabled>
            ‹
          </button>
          <button className={`${styles.pageButton} ${styles.pageButtonActive}`}>1</button>
          <button className={styles.pageButton} disabled>
            2
          </button>
          <button className={styles.pageButton} disabled>
            3
          </button>
          <span>…</span>
          <button className={styles.pageButton} disabled>
            ›
          </button>
        </span>
      </div>
    </div>
  );
}
