import { type CSSProperties, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Archive,
  BellRing,
  CalendarDays,
  CircleGauge,
  ClipboardCheck,
  Download,
  FilePlus2,
  Inbox,
  Info,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { roleLabels, useCurrentUser, useSession } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { EmptyState } from '../../common/components/index.ts';
import { downloadCsv } from '../../common/utils/download.ts';
import { formatLongDate } from '../../common/utils/format.ts';
import { useDossiers } from '../documental/useDossiers.ts';
import {
  contarPorGrupo,
  GRUPOS_ESTADO,
  grupoDeEstado,
  segmentosDona,
  tonoDeEstado,
} from '../../common/workflow/estados.ts';
import styles from './DashboardPage.module.css';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const STATUS_CLASS = {
  neutral: styles.statusNeutral,
  info: styles.statusInfo,
  warning: styles.statusWarning,
  success: styles.statusSuccess,
  final: styles.statusFinal,
};

function statusClass(code: string) {
  return STATUS_CLASS[tonoDeEstado(code)];
}

export function DashboardPage() {
  const user = useCurrentUser();
  const { roleNames } = useSession();
  const roles = roleLabels(user, roleNames) || 'Usuario institucional';
  const canCreate = hasPermission(user.permissions, 'dossiers.create');
  const { items: dossiers, error } = useDossiers();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return query
      ? dossiers.filter((item) =>
          [item.code, item.title, item.schoolCode]
            .join(' ')
            .toLocaleLowerCase('es')
            .includes(query),
        )
      : dossiers;
  }, [dossiers, search]);

  const counts = useMemo(
    () => contarPorGrupo(dossiers.map((item) => item.currentState.code)),
    [dossiers],
  );

  const monthly = useMemo(() => {
    const current = new Date();
    return Array.from({ length: 10 }, (_, index) => {
      const date = new Date(current.getFullYear(), current.getMonth() - 9 + index, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const items = dossiers.filter((item) => {
        const created = new Date(item.createdAt);
        return created.getMonth() === month && created.getFullYear() === year;
      });
      return {
        label: MONTHS[month],
        created: items.length,
        completed: items.filter((item) => grupoDeEstado(item.currentState.code) === 'cierre')
          .length,
      };
    });
  }, [dossiers]);
  const maxMonthly = Math.max(1, ...monthly.flatMap((item) => [item.created, item.completed]));
  const total = dossiers.length;
  const percent = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));
  const donutStyle = { '--donut-fill': segmentosDona(counts) } as CSSProperties;
  const legend = GRUPOS_ESTADO.filter((group) => group.id !== 'otros' || counts.otros > 0);

  function exportReport() {
    downloadCsv(
      `sigesdoc-panel-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Código', 'Título', 'Programa', 'Unidad', 'Responsable', 'Estado', 'Fecha'],
      dossiers.map((item) => [
        item.code,
        item.title,
        item.degreeProgramCode,
        item.schoolCode,
        item.assignedSpecialist?.name ?? 'Sin asignar',
        item.currentState.name,
        item.createdAt,
      ]),
    );
  }

  return (
    <div className={styles.page}>
      <title>Panel principal | SIGESDOC</title>
      <header className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <p className={styles.breadcrumb}>
            Inicio &nbsp; / &nbsp; <strong>Panel Principal</strong>
          </p>
          <h1>
            Bienvenido/a,
            <br /> <strong>{user.name}</strong>
          </h1>
          <p className={styles.roleLine}>
            <ShieldCheck size={15} /> {roles} — UAPA &nbsp; • &nbsp; <CalendarDays size={15} />{' '}
            {formatLongDate(new Date())}
          </p>
        </div>
        <div className={styles.welcomeActions}>
          <button type="button" className={styles.secondaryButton} onClick={exportReport}>
            <Download size={16} /> Exportar Reporte
          </button>
          {canCreate ? (
            <Link to="/expedientes/nuevo" className={styles.primaryButton}>
              <FilePlus2 size={16} /> Registrar Documento
            </Link>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              disabled
              title="Su rol no tiene el permiso dossiers.create"
            >
              <FilePlus2 size={16} /> Registrar Documento
            </button>
          )}
        </div>
      </header>

      {user.permissions.length === 0 ? (
        <EmptyState title="No tiene módulos asignados">
          Su sesión está activa, pero su cuenta no tiene permisos sobre ningún módulo.
        </EmptyState>
      ) : (
        <>
          {error && <div className={styles.error}>{error}</div>}
          {dossiers.length === 0 && !error && (
            <p className={styles.dataNotice}>
              No hay datos simulados: los indicadores permanecen en cero hasta recibir expedientes
              del backend.
            </p>
          )}

          <ul className={styles.metrics} aria-label="Indicadores">
            <li>
              <span>Expedientes</span>
              <b>Total visibles</b>
              <strong>{total}</strong>
              <small>Según su rol y alcance</small>
              <i>
                <Archive size={21} />
              </i>
            </li>
            <li>
              <span>Recepción</span>
              <b>Recepcionados o asignados</b>
              <strong>{counts.recepcion}</strong>
              <small>Aún no inician la revisión</small>
              <i>
                <Inbox size={21} />
              </i>
            </li>
            <li>
              <span>Revisión técnico-curricular</span>
              <b>En revisión</b>
              <strong>{counts.revision}</strong>
              <small>Revisión, reenvío o reevaluación</small>
              <i>
                <ClipboardCheck size={21} />
              </i>
            </li>
            <li>
              <span>Correcciones</span>
              <b>Requieren ajustes</b>
              <strong>{counts.ajustes}</strong>
              <small>Devueltos con observaciones</small>
              <i>
                <RotateCcw size={21} />
              </i>
            </li>
          </ul>

          <section className={styles.analyticsGrid} aria-label="Indicadores gráficos">
            <article className={styles.chartCard}>
              <header>
                <div>
                  <h2>Expedientes registrados por mes</h2>
                  <p>Histórico calculado con los expedientes visibles en el backend.</p>
                </div>
                <div className={styles.legend}>
                  <span>
                    <b className={styles.navyKey} /> Radicados
                  </span>
                  <span>
                    <b className={styles.orangeKey} /> Concluidos
                  </span>
                </div>
              </header>
              <div className={styles.barChart} aria-label="Expedientes registrados por mes">
                {monthly.map((item) => (
                  <div className={styles.barGroup} key={item.label}>
                    <div className={styles.bars}>
                      <i style={{ height: `${Math.max(4, (item.created / maxMonthly) * 100)}%` }} />
                      <i
                        style={{ height: `${Math.max(4, (item.completed / maxMonthly) * 100)}%` }}
                      />
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <footer>
                <span>
                  <Info size={14} /> Datos agrupados por fecha de creación
                </span>
                <strong>{total} expedientes visibles</strong>
              </footer>
            </article>

            <article className={styles.donutCard}>
              <header>
                <div>
                  <h2>Estado de Trámite</h2>
                  <p>Distribución por etapa del flujo curricular</p>
                </div>
              </header>
              <div className={styles.donutContent}>
                <div
                  className={`${styles.donut} ${total === 0 ? styles.donutEmpty : ''}`}
                  style={donutStyle}
                >
                  <span>
                    <strong>{total ? '100%' : '0%'}</strong>
                    <small>Total visible</small>
                  </span>
                </div>
                <ul>
                  {legend.map((group) => (
                    <li key={group.id}>
                      <b className={styles.legendKey} style={{ background: group.color }} />
                      {group.etiqueta} <strong>{percent(counts[group.id])}%</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.calibration}>
                <CircleGauge size={14} /> Distribución real según el contrato de expedientes
              </div>
            </article>
          </section>

          <section className={styles.lowerGrid}>
            <article className={styles.activity}>
              <header>
                <div>
                  <h2>Actividad Reciente en el Sistema</h2>
                  <p>Últimos expedientes radicados, modificados y transferidos.</p>
                </div>
                <label className={styles.filter}>
                  <Search size={15} />{' '}
                  <input
                    type="search"
                    aria-label="Filtrar la actividad reciente"
                    placeholder="Filtrar por código..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                    }}
                  />
                </label>
              </header>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Código único</th>
                      <th>Título del documento</th>
                      <th>Programa</th>
                      <th>Unidad académica</th>
                      <th>Responsable</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 5).map((item) => (
                      <tr key={item.dossierId}>
                        <td className={styles.code}>{item.code}</td>
                        <td>
                          <Link to={`/revision?dossierId=${item.dossierId}`}>{item.title}</Link>
                          <small>{item.subjectCode}</small>
                        </td>
                        <td>{item.degreeProgramCode}</td>
                        <td>{item.schoolCode}</td>
                        <td>{item.assignedSpecialist?.name ?? 'Sin asignar'}</td>
                        <td>
                          <span
                            className={`${styles.status} ${statusClass(item.currentState.code)}`}
                          >
                            ● {item.currentState.name}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className={styles.empty}>
                          Sin registros disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer>
                <span>
                  Mostrando {Math.min(5, filtered.length)} de {filtered.length} registros
                </span>
                <span>
                  <button disabled>Anterior</button> &nbsp; <b>1</b> &nbsp; … &nbsp;{' '}
                  <button disabled>Siguiente</button>
                </span>
              </footer>
            </article>

            <aside className={styles.alerts} aria-label="Tareas pendientes">
              <header>
                <div>
                  <h2>
                    <BellRing size={20} /> Tareas pendientes
                  </h2>
                  <p>Calculadas con los expedientes visibles para su usuario</p>
                </div>
              </header>
              <div className={styles.alertCardWarning}>
                <b>Requieren ajustes</b>
                <p>{counts.ajustes} expedientes esperan corrección y reenvío.</p>
              </div>
              <div className={styles.alertCardNeutral}>
                <b>En revisión</b>
                <p>{counts.revision} expedientes están en revisión o reevaluación.</p>
              </div>
              <div className={styles.alertCardNeutral}>
                <b>Pendientes de asignación</b>
                <p>{counts.recepcion} expedientes están recepcionados o asignados.</p>
              </div>
              <Link className={styles.allAlerts} to="/expedientes">
                Ver expedientes →
              </Link>
              <p className={styles.alertNote}>
                Las notificaciones automáticas (RF-14) se incorporarán cuando el backend registre
                los eventos del flujo.
              </p>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
