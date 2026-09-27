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
  Landmark,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { roleLabels, useCurrentUser, useSession } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { EmptyState } from '../../common/components/index.ts';
import { downloadCsv } from '../../common/utils/download.ts';
import { formatLongDate } from '../../common/utils/format.ts';
import { useDossiers } from '../documental/useDossiers.ts';
import type { Dossier } from '../documental/types.ts';
import styles from './DashboardPage.module.css';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function statusClass(code: string) {
  if (code === 'FINAL' || code.includes('APPROVED')) return styles.statusSuccess;
  if (code.includes('REVIEW')) return styles.statusWarning;
  return styles.statusNeutral;
}

function stateGroup(item: Dossier): 'received' | 'review' | 'final' | 'other' {
  const code = item.currentState.code;
  if (code === 'FINAL' || code.includes('APPROVED')) return 'final';
  if (code.includes('REVIEW')) return 'review';
  if (code === 'RECEIVED') return 'received';
  return 'other';
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

  const counts = useMemo(() => {
    const result = { received: 0, review: 0, final: 0, other: 0 };
    dossiers.forEach((item) => {
      result[stateGroup(item)] += 1;
    });
    return result;
  }, [dossiers]);

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
        completed: items.filter((item) => stateGroup(item) === 'final').length,
      };
    });
  }, [dossiers]);
  const maxMonthly = Math.max(1, ...monthly.flatMap((item) => [item.created, item.completed]));
  const total = dossiers.length;
  const percent = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));
  const receivedStop = percent(counts.received);
  const reviewStop = receivedStop + percent(counts.review);
  const finalStop = reviewStop + percent(counts.final);
  const donutStyle = {
    '--received-stop': `${receivedStop}%`,
    '--review-stop': `${reviewStop}%`,
    '--final-stop': `${finalStop}%`,
  } as CSSProperties;

  function exportReport() {
    downloadCsv(
      `sigesdoc-panel-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Código', 'Título', 'Serie', 'Unidad', 'Responsable', 'Estado', 'Fecha'],
      dossiers.map((item) => [
        item.code,
        item.title,
        item.degreeProgramCode,
        item.schoolCode,
        item.createdBy.name,
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
              no hay datos simulados: los indicadores permanecen en cero hasta recibir expedientes
              del backend.
            </p>
          )}

          <ul className={styles.metrics} aria-label="Indicadores">
            <li>
              <span>Acervo documental</span>
              <b>Total Documentos Custodiados</b>
              <strong>{total}</strong>
              <small>Expedientes visibles según alcance</small>
              <i>
                <Archive size={21} />
              </i>
            </li>
            <li>
              <span>Mesa de entrada</span>
              <b>Pendientes de Clasificación</b>
              <strong>{counts.received}</strong>
              <small>Requieren asignación de serie y caja</small>
              <i>
                <Inbox size={21} />
              </i>
            </li>
            <li>
              <span>Comisiones académicas</span>
              <b>En Revisión Curricular</b>
              <strong>{counts.review}</strong>
              <small>Planes y programas en vicerrectoría</small>
              <i>
                <ClipboardCheck size={21} />
              </i>
            </li>
            <li>
              <span>Ley 481-08 / TRD</span>
              <b>Archivo Histórico UAPA</b>
              <strong>{counts.final}</strong>
              <small>Expedientes con valor permanente</small>
              <i>
                <Landmark size={21} />
              </i>
            </li>
          </ul>

          <section className={styles.analyticsGrid} aria-label="Indicadores gráficos">
            <article className={styles.chartCard}>
              <header>
                <div>
                  <h2>Ingreso y Radicación Mensual de Documentos</h2>
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
              <div className={styles.barChart} aria-label="Radicación mensual">
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
                  <p>Frecuencia y ciclo vital de retención</p>
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
                  <li>
                    <b className={styles.navyKey} />
                    Recepcionado <strong>{percent(counts.received)}%</strong>
                  </li>
                  <li>
                    <b className={styles.orangeKey} />
                    En revisión <strong>{percent(counts.review)}%</strong>
                  </li>
                  <li>
                    <b className={styles.blueKey} />
                    Concluido <strong>{percent(counts.final)}%</strong>
                  </li>
                  <li>
                    <b className={styles.redKey} />
                    Otros estados <strong>{percent(counts.other)}%</strong>
                  </li>
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
                      <th>Serie documental</th>
                      <th>Unidad de origen</th>
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
                        <td>{item.createdBy.name}</td>
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

            <aside className={styles.alerts} aria-label="Alertas TRD">
              <header>
                <div>
                  <h2>
                    <BellRing size={20} /> Alertas TRD
                  </h2>
                  <p>Vencimientos bajo Tabla de Retención (Ley 481-08)</p>
                </div>
                <span>Ruta pendiente</span>
              </header>
              <div className={styles.alertCardDanger}>
                <b>Vencimiento TRD</b>
                <p>
                  Los plazos de transferencia aparecerán cuando backend publique el servicio de
                  alertas.
                </p>
                <button disabled>Proceder a Transferencia →</button>
              </div>
              <div className={styles.alertCardWarning}>
                <b>Pendiente Dictamen</b>
                <p>{counts.review} expedientes visibles están actualmente en revisión.</p>
                <button disabled>Notificar Comisiones →</button>
              </div>
              <div className={styles.alertCardNeutral}>
                <b>Auditoría Interna</b>
                <p>La revisión consolidada estará disponible con el endpoint de auditoría.</p>
                <button disabled>Abrir Cuadro de Cotejo →</button>
              </div>
              <button className={styles.allAlerts} disabled>
                Ver todas las alertas ↗
              </button>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
