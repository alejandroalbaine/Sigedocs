import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Download, FileArchive, FilePlus2, SlidersHorizontal } from 'lucide-react';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { downloadCsv } from '../../common/utils/download.ts';
import { useDossiers } from '../documental/useDossiers.ts';
import { claseEstado } from '../documental/estadoBadge.ts';
import styles from '../documental/documental.module.css';

const PAGE_SIZE = 10;

export function GestionPage() {
  const user = useCurrentUser();
  const canCreate = hasPermission(user.permissions, 'dossiers.create');
  const { items, loading, error } = useDossiers();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return items.filter((item) => {
      const matchesText =
        !normalized ||
        [item.code, item.title, item.schoolCode, item.degreeProgramCode, item.subjectCode]
          .join(' ')
          .toLocaleLowerCase('es')
          .includes(normalized);
      return (
        matchesText &&
        (!stateFilter || item.currentState.code === stateFilter) &&
        (!unitFilter || item.schoolCode === unitFilter)
      );
    });
  }, [items, query, stateFilter, unitFilter]);
  const states = [
    ...new Map(items.map((item) => [item.currentState.code, item.currentState])).values(),
  ];
  const units = [...new Set(items.map((item) => item.schoolCode))].sort();
  const activeFilters = Number(Boolean(stateFilter)) + Number(Boolean(unitFilter));
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(firstIndex, firstIndex + PAGE_SIZE);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      visible.map((item) => [
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
            <FileArchive size={16} /> Expedientes curriculares &nbsp; • &nbsp; RF-01 / RF-09
          </p>
          <h1>Gestión documental</h1>
          <p>
            Expedientes curriculares digitales visibles según su rol y alcance, con su estado,
            responsable y versión vigente.
          </p>
        </div>
        <div className={styles.total}>
          <span>Total visibles</span>
          <strong>{items.length.toLocaleString('es-DO')}</strong>
          <small>expedientes</small>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchGroup}>
          <span className="visually-hidden">Buscar expedientes</span>
          <input
            className={`${styles.input} ${styles.search}`}
            type="search"
            placeholder="Buscar por código, título, unidad, serie documental o descriptor..."
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
        <button className={styles.button} onClick={exportDossiers}>
          <Download size={16} /> Exportar
        </button>
        {canCreate ? (
          <Link className={`${styles.button} ${styles.buttonOrange}`} to="/expedientes/nuevo">
            <FilePlus2 size={16} /> Nuevo Registro
          </Link>
        ) : (
          <button
            className={`${styles.button} ${styles.buttonOrange}`}
            disabled
            title="Su rol no tiene el permiso dossiers.create"
          >
            <FilePlus2 size={16} /> Nuevo Registro
          </button>
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
              {states.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Unidad productora</span>
            <select
              className={styles.select}
              value={unitFilter}
              onChange={(event) => {
                setUnitFilter(event.target.value);
              }}
            >
              <option value="">Todas las unidades</option>
              {units.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => {
              setStateFilter('');
              setUnitFilter('');
            }}
          >
            Limpiar filtros
          </button>
        </section>
      )}

      {error && <div className={styles.error}>{error}</div>}
      <section className={styles.panel} aria-labelledby="gestion-title">
        <div className={styles.selectionBar}>
          <span className={styles.selectionMeta}>
            <input
              className={styles.rowCheck}
              type="checkbox"
              aria-label="Seleccionar todos los expedientes visibles"
              checked={visible.length > 0 && visible.every((item) => selected.has(item.dossierId))}
              onChange={(event) => {
                setSelected(
                  event.target.checked ? new Set(visible.map((item) => item.dossierId)) : new Set(),
                );
              }}
            />
            <strong id="gestion-title">Selección masiva</strong>
            <span>│</span>
            <span>{selected.size} expedientes seleccionados</span>
          </span>
        </div>

        {loading ? (
          <p className={styles.empty}>Consultando expedientes…</p>
        ) : visible.length === 0 ? (
          <p className={styles.empty}>
            No hay expedientes que coincidan con su búsqueda y alcance.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-label="Desplegar" />
                  <th aria-label="Seleccionar" />
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
                {pageItems.map((item) => (
                  <tr key={item.dossierId}>
                    <td className={styles.rowToggle}>›</td>
                    <td>
                      <input
                        className={styles.rowCheck}
                        type="checkbox"
                        aria-label={`Seleccionar ${item.code}`}
                        checked={selected.has(item.dossierId)}
                        onChange={() => {
                          toggle(item.dossierId);
                        }}
                      />
                    </td>
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
        <div className={styles.pager}>
          <span>
            Mostrando{' '}
            <strong>
              {visible.length === 0 ? 0 : firstIndex + 1} - {firstIndex + pageItems.length}
            </strong>{' '}
            de <strong>{visible.length}</strong> expedientes
          </span>
          {pageCount > 1 && (
            <span className={styles.pages}>
              <button
                type="button"
                className={styles.pageButton}
                aria-label="Página anterior"
                disabled={currentPage === 1}
                onClick={() => {
                  setPage(currentPage - 1);
                }}
              >
                ‹
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  type="button"
                  key={number}
                  className={`${styles.pageButton} ${number === currentPage ? styles.pageButtonActive : ''}`}
                  aria-current={number === currentPage ? 'page' : undefined}
                  onClick={() => {
                    setPage(number);
                  }}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageButton}
                aria-label="Página siguiente"
                disabled={currentPage === pageCount}
                onClick={() => {
                  setPage(currentPage + 1);
                }}
              >
                ›
              </button>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
