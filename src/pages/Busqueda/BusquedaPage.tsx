import { useState, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { FileSearch, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { EnPreparacion } from '../documental/EnPreparacion.tsx';
import { PAGE_SIZE } from '../../common/api/dossiers.ts';
import { OPCIONES_ESTADO, tonoDeEstado } from '../../common/workflow/estados.ts';
import { DossierPager } from '../documental/DossierPager.tsx';
import { LEVEL_OPTIONS } from '../documental/filterOptions.ts';
import { useDossiersPaginados } from '../documental/useDossiersPaginados.ts';
import { claseEstado } from '../documental/estadoBadge.ts';
import styles from '../documental/documental.module.css';

export function BusquedaPage() {
  const [params, setParams] = useSearchParams();
  const currentQuery = params.get('q') ?? '';
  const [term, setTerm] = useState(currentQuery);
  const currentLevel = params.get('level') ?? '';
  const currentState = params.get('state') ?? '';
  const [level, setLevel] = useState(currentLevel);
  const [state, setState] = useState(currentState);
  const { items, loading, error, pendiente, page, hasNext, hasPrevious, next, previous } =
    useDossiersPaginados({
      search: currentQuery,
      academicLevel: currentLevel,
      currentState,
    });
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
          <h1>Búsqueda avanzada de expedientes</h1>
          <p>
            Localice expedientes curriculares por código, título o asignatura dentro de su alcance
            autorizado.
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
            <Search size={16} /> Buscar
          </button>
        </form>
      </header>

      <details className={styles.filterBar}>
        <summary>
          <span className={styles.summaryIcon}>
            <SlidersHorizontal size={18} />
          </span>
          <h2>Filtros Avanzados</h2>
          {activeFilters > 0 && (
            <span className={styles.badgeWarning}>
              {activeFilters} {activeFilters === 1 ? 'activo' : 'activos'}
            </span>
          )}
          <span className={styles.subtle}>• Código, título, asignatura, nivel o estado</span>
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
              {OPCIONES_ESTADO.map((option) => (
                <option key={option.codigo} value={option.codigo}>
                  {option.nombre}
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
      {pendiente && <EnPreparacion />}
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
              Resultados según el alcance autorizado por el servidor
            </span>
          </div>
        </div>
        <div className={styles.resultActions}>
          <span className={styles.buttonSecondary}>
            <List size={16} /> Lista Detallada
          </span>
        </div>
      </section>

      <section className={styles.cards} aria-label="Resultados de búsqueda">
        {!loading && !pendiente && items.length === 0 && (
          <p className={styles.empty}>No se encontraron expedientes.</p>
        )}
        {items.map((item) => (
          <details
            className={`${styles.result} ${
              tonoDeEstado(item.currentState.code) === 'warning' ? styles.resultWarning : ''
            }`}
            key={item.dossierId}
          >
            <summary>
              <span className={styles.code}>{item.code}</span>
              <strong>{item.title}</strong>
              <span className={styles.badge}>{item.schoolCode}</span>
              <span className={claseEstado(item.currentState.code)}>{item.currentState.name}</span>
              <span className={styles.subtle}>
                {item.currentVersion.label} &nbsp; • &nbsp; expediente digital
              </span>
            </summary>
            <div className={styles.resultBody}>
              <p>
                {item.schoolCode} · {item.degreeProgramCode} · {item.subjectCode}
              </p>
              <div className={styles.resultActions}>
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
