import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Download,
  FileArchive,
  FilePlus2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { downloadCsv } from '../../common/utils/download.ts';
import { DossierPager } from '../documental/DossierPager.tsx';
import { LEVEL_OPTIONS, useSeenStates } from '../documental/filterOptions.ts';
import { PAGE_SIZE, useDossiers } from '../documental/useDossiers.ts';
import styles from '../documental/documental.module.css';

function estadoClase(codigo: string) {
  if (codigo === 'FINAL' || codigo.includes('APPROVED')) return styles.badgeSuccess;
  if (codigo.includes('REVIEW')) return styles.badgeWarning;
  return '';
}

export function GestionPage() {
  const user = useCurrentUser();
  const canCreate = hasPermission(user.permissions, 'dossiers.create');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [query]);
  const { items, loading, error, page, hasNext, hasPrevious, next, previous } = useDossiers({
    search,
    currentState: stateFilter,
    academicLevel: levelFilter,
  });
  const visible = items;
  const states = useSeenStates(items, stateFilter);
  const activeFilters = Number(Boolean(stateFilter)) + Number(Boolean(levelFilter));

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
      ['Código', 'Título', 'Serie', 'Unidad', 'Asignatura', 'Estado', 'Creado'],
      visible.map((item) => [
        item.code,
        item.title,
        item.degreeProgramCode,
        item.schoolCode,
        item.subjectCode,
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
            <FileArchive size={16} /> Módulo archivístico central &nbsp; • &nbsp; Norma Ley 481-08 /
            AGN
          </p>
          <h1>Gestión Documental y Archivo Curricular</h1>
          <p>
            Catálogo general de expedientes, resoluciones y programas académicos bajo custodia
            institucional de la Universidad Abierta para Adultos (UAPA).
          </p>
        </div>
        <div className={styles.total}>
          <span>Total custodia activa</span>
          <strong>{items.length.toLocaleString('es-DO')}</strong>
          <small>expedientes en esta página</small>
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
          <span className={styles.repository}>
            <i className={styles.onlineDot} /> Repositorio conectado: UAPA-SAN-01{' '}
            <RefreshCw size={14} />
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
                  <th>Código radicación</th>
                  <th>Nombre / título del expediente</th>
                  <th>Serie documental</th>
                  <th>Unidad productora</th>
                  <th>Fecha creación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
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
                      <span className={styles.subtle}>
                        {item.subjectCode} · {item.currentVersion.label}
                      </span>
                    </td>
                    <td>
                      <span className={styles.badge}>
                        {item.degreeProgramCode || 'Planes de Estudio'}
                      </span>
                    </td>
                    <td>{item.schoolCode}</td>
                    <td className={styles.code}>
                      {new Date(item.createdAt).toLocaleDateString('es-DO')}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${estadoClase(item.currentState.code)}`}>
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

      <div className={styles.compliance}>
        <span>
          <ShieldCheck size={16} /> Cumplimiento Normativo y Alertas Archivísticas (Ley 481-08 /
          AGN) <span className={styles.badge}>3 activas</span>
        </span>
        <span>3 activas · Desplegar⌄</span>
      </div>
    </div>
  );
}
