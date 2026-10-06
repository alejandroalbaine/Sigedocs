import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Download, FileArchive, FilePlus2, SlidersHorizontal } from 'lucide-react';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { PAGE_SIZE } from '../../common/api/dossiers.ts';
import { downloadCsv } from '../../common/utils/download.ts';
import { OPCIONES_ESTADO } from '../../common/workflow/estados.ts';
import { DossierPager } from '../documental/DossierPager.tsx';
import { EnPreparacion } from '../documental/EnPreparacion.tsx';
import { LEVEL_OPTIONS } from '../documental/filterOptions.ts';
import { useDossiersPaginados } from '../documental/useDossiersPaginados.ts';
import { claseEstado } from '../documental/estadoBadge.ts';
import styles from '../documental/documental.module.css';

export function GestionPage() {
  const user = useCurrentUser();
  const canCreate = hasPermission(user.permissions, 'dossiers.create');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [query]);
  const { items, loading, error, pendiente, page, hasNext, hasPrevious, next, previous } =
    useDossiersPaginados({ search, currentState: stateFilter, academicLevel: levelFilter });
  const activeFilters = Number(Boolean(stateFilter)) + Number(Boolean(levelFilter));

  function exportDossiers() {
    downloadCsv(
      'sigesdoc-expedientes.csv',
      [
        'Código',
        'Título',
        'Programa',
        'Unidad',
        'Asignatura',
        'Responsable',
        'Versión',
        'Estado',
        'Creado',
      ],
      items.map((item) => [
        item.code,
        item.title,
        item.degreeProgramCode,
        item.schoolCode,
        item.subjectCode,
        item.assignedSpecialist?.name ?? 'Sin asignar',
        item.currentVersion.label,
        item.currentState.name,
        item.createdAt,
      ]),
    );
  }

  return (
    <div className={styles.page}>
      <title>Gestión documental | SIGESDOC</title>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <FileArchive size={16} /> Expedientes curriculares
          </p>
          <h1>Gestión documental</h1>
          <p>
            Expedientes curriculares digitales visibles según su rol y alcance, con su estado,
            responsable y versión vigente.
          </p>
        </div>
        <div className={styles.total}>
          <span>En esta página</span>
          <strong>{items.length.toLocaleString('es-DO')}</strong>
          <small>expedientes (máximo {PAGE_SIZE} por página)</small>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchGroup}>
          <span className="visually-hidden">Buscar expedientes</span>
          <input
            className={`${styles.input} ${styles.search}`}
            type="search"
            placeholder="Buscar por código, título, unidad, programa o asignatura..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          type="button"
          aria-expanded={showFilters}
          onClick={() => {
            setShowFilters((value) => !value);
          }}
        >
          <SlidersHorizontal size={16} /> Filtros Avanzados{' '}
          <span className={styles.badge}>{activeFilters} activos</span>
        </button>
        {items.length > 0 && (
          <button className={styles.button} onClick={exportDossiers}>
            <Download size={16} /> Exportar
          </button>
        )}
        {canCreate && (
          <Link className={`${styles.button} ${styles.buttonOrange}`} to="/expedientes/nuevo">
            <FilePlus2 size={16} /> Nuevo Registro
          </Link>
        )}
      </div>

      {showFilters && (
        <section className={styles.localFilters} aria-label="Filtros de expedientes">
          <label className={styles.field}>
            <span>Estado</span>
            <select
              className={styles.select}
              value={stateFilter}
              onChange={(event) => {
                setStateFilter(event.target.value);
              }}
            >
              <option value="">Todos los estados</option>
              {OPCIONES_ESTADO.map((state) => (
                <option key={state.codigo} value={state.codigo}>
                  {state.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Nivel académico</span>
            <select
              className={styles.select}
              value={levelFilter}
              onChange={(event) => {
                setLevelFilter(event.target.value);
              }}
            >
              <option value="">Todos los niveles</option>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => {
              setStateFilter('');
              setLevelFilter('');
            }}
          >
            Limpiar filtros
          </button>
        </section>
      )}

      {error && <div className={styles.error}>{error}</div>}
      {pendiente && <EnPreparacion />}
      <section className={styles.panel} aria-label="Expedientes">
        {loading ? (
          <p className={styles.empty}>Consultando expedientes…</p>
        ) : pendiente ? null : items.length === 0 ? (
          <p className={styles.empty}>
            No hay expedientes que coincidan con su búsqueda y alcance.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título del expediente</th>
                  <th>Programa</th>
                  <th>Unidad académica</th>
                  <th>Responsable</th>
                  <th>Versión</th>
                  <th>Fecha creación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.dossierId}>
                    <td className={styles.code}>▱ {item.code}</td>
                    <td>
                      <Link className={styles.title} to={`/revision?dossierId=${item.dossierId}`}>
                        {item.title}
                      </Link>
                      <span className={styles.subtle}>{item.subjectCode}</span>
                    </td>
                    <td>
                      <span className={styles.badge}>{item.degreeProgramCode}</span>
                    </td>
                    <td>{item.schoolCode}</td>
                    <td>{item.assignedSpecialist?.name ?? 'Sin asignar'}</td>
                    <td className={styles.code}>{item.currentVersion.label}</td>
                    <td className={styles.code}>
                      {new Date(item.createdAt).toLocaleDateString('es-DO')}
                    </td>
                    <td>
                      <span className={claseEstado(item.currentState.code)}>
                        {item.currentState.name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DossierPager
          count={items.length}
          page={page}
          pageSize={PAGE_SIZE}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onNext={next}
          onPrevious={previous}
        />
      </section>
    </div>
  );
}
