import { useState, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Download, FileSearch, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { DossierPager } from '../documental/DossierPager.tsx';
import { LEVEL_OPTIONS, useSeenStates } from '../documental/filterOptions.ts';
import { PAGE_SIZE, useDossiers } from '../documental/useDossiers.ts';
import styles from '../documental/documental.module.css';

export function BusquedaPage() {
  const [params, setParams] = useSearchParams();
  const currentQuery = params.get('q') ?? '';
  const currentLevel = params.get('level') ?? '';
  const currentState = params.get('state') ?? '';
  const [term, setTerm] = useState(currentQuery);
  const [level, setLevel] = useState(currentLevel);
  const [state, setState] = useState(currentState);
  const { items, loading, error, page, hasNext, hasPrevious, next, previous } = useDossiers({
    search: currentQuery,
    academicLevel: currentLevel,
    currentState,
  });
  const states = useSeenStates(items, state);
  const activeFilters = [currentQuery, currentLevel, currentState].filter(Boolean).length;

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams: Record<string, string> = {};
    if (term.trim()) nextParams.q = term.trim();
    if (level) nextParams.level = level;
    if (state) nextParams.state = state;
    setParams(nextParams);
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
              setLevel('');
              setState('');
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
          <span className={styles.badgeWarning}>{activeFilters} activos</span>
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
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="state">Estado</label>
            <select
              id="state"
              className={styles.select}
              value={state}
              onChange={(event) => {
                setState(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {states.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
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
                  Se muestran <span className={styles.eyebrowOrange}>{items.length}</span>{' '}
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
        {items.map((item, index) => (
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

      <DossierPager
        count={items.length}
        page={page}
        pageSize={PAGE_SIZE}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        onNext={next}
        onPrevious={previous}
      />
    </div>
  );
}
