import { useMemo, useState, type CSSProperties } from 'react';
import {
  Archive,
  BarChart3,
  Clock3,
  Download,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { downloadCsv } from '../../common/utils/download.ts';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from '../documental/documental.module.css';

const stateGroups = [
  {
    label: 'Recepcionado',
    color: '#001f4d',
    test: (code: string) => code.includes('RECE') || code.includes('DRAFT'),
  },
  { label: 'En revisión', color: '#ff8319', test: (code: string) => code.includes('REVIEW') },
  { label: 'Concluido', color: '#4f6da8', test: (code: string) => code.includes('FINAL') },
  { label: 'Otros estados', color: '#c9181f', test: () => true },
];

export function ReportesPage() {
  const { items, error } = useDossiers();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [unit, setUnit] = useState('');
  const units = [...new Set(items.map((item) => item.schoolCode))].sort();
  const filtered = items.filter(
    (item) =>
      new Date(item.createdAt).getFullYear() === Number(year) &&
      (!unit || item.schoolCode === unit),
  );
  const byMonth = useMemo(
    () =>
      Array.from(
        { length: 12 },
        (_, month) =>
          filtered.filter((item) => new Date(item.createdAt).getMonth() === month).length,
      ),
    [filtered],
  );
  const maxMonth = Math.max(1, ...byMonth);
  const counts = stateGroups.map((group, index) => ({
    ...group,
    count: filtered.filter(
      (item) =>
        group.test(item.currentState.code) &&
        !stateGroups.slice(0, index).some((previous) => previous.test(item.currentState.code)),
    ).length,
  }));
  const review = counts[1]?.count ?? 0;
  const final = counts[2]?.count ?? 0;
  const archived = filtered.filter(
    (item) => item.currentState.code === 'ARCHIVED_IMPLEMENTED',
  ).length;

  function exportReport() {
    downloadCsv(
      `sigesdoc-auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Código', 'Título', 'Unidad', 'Estado', 'Creado'],
      filtered.map((item) => [
        item.code,
        item.title,
        item.schoolCode,
        item.currentState.name,
        item.createdAt,
      ]),
    );
  }

  return (
    <div className={styles.page}>
      <title>Reportes y estadísticas | SIGESDOC</title>
      <header className={styles.reportHeader}>
        <div>
          <p className={styles.eyebrow}>
            Auditoría trimestral <span className={styles.badge}>Resolución AGN-02-2024</span>
          </p>
          <h1>Estadísticas y Auditoría Archivística Institucional</h1>
          <p>
            Monitoreo cuantitativo del fondo documental, cumplimiento de la Ley 481-08 y flujos de
            retención.
          </p>
        </div>
        <div className={styles.reportFilters}>
          <select
            className={styles.select}
            aria-label="Periodo"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
            }}
          >
            {[0, 1, 2].map((offset) => {
              const value = new Date().getFullYear() - offset;
              return <option key={value}>{value}</option>;
            })}
          </select>
          <select
            className={styles.select}
            aria-label="Unidad"
            value={unit}
            onChange={(event) => {
              setUnit(event.target.value);
            }}
          >
            <option value="">Consolidado: todas las facultades</option>
            {units.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button className={`${styles.button} ${styles.buttonOrange}`} onClick={exportReport}>
            <Download size={16} /> Exportar informe (CSV)
          </button>
        </div>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.auditHash}>
        <ShieldCheck size={17} /> Marco legal 481-08 / AGN{' '}
        <span className={styles.badge}>Integridad según registros visibles</span>
      </div>
      <section className={styles.metrics} aria-label="Indicadores de auditoría">
        {[
          [
            BarChart3,
            'Índice digitalización',
            filtered.length ? '100%' : '0%',
            'Expedientes visibles digitalizados',
          ],
          [Archive, 'Transferencias archivo central', final, 'Expedientes concluidos'],
          [Clock3, 'Tasa oportunidad radicación', review, 'En revisión según alcance'],
          [Landmark, 'Custodia permanente AGN', archived, 'Expedientes transferidos'],
        ].map(([Icon, label, value, description]) => {
          const MetricIcon = Icon as typeof BarChart3;
          return (
            <article className={styles.metric} key={String(label)}>
              <MetricIcon size={23} />
              <span>{label as string}</span>
              <strong>{value as string | number}</strong>
              <small className={styles.subtle}>{description as string}</small>
              <div className={styles.metricLine} />
            </article>
          );
        })}
      </section>

      <details className={styles.reportModule} open>
        <summary>
          <BarChart3 size={19} />
          <span>
            <strong>Análisis gráfico y tendencias TRD</strong>
            <small>Evolución mensual y distribución por estado</small>
          </span>
          <span>Minimizar / desplegar</span>
        </summary>
        <div className={styles.reportVisuals}>
          <section>
            <h2>Evolución mensual de expedientes</h2>
            <div className={styles.barChart}>
              {byMonth.map((count, index) => (
                <div key={index}>
                  <span
                    style={{ height: `${Math.max(4, (count / maxMonth) * 100)}%` }}
                    title={`${count} expedientes`}
                  />
                  <small>
                    {
                      [
                        'Ene',
                        'Feb',
                        'Mar',
                        'Abr',
                        'May',
                        'Jun',
                        'Jul',
                        'Ago',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dic',
                      ][index]
                    }
                  </small>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2>Distribución por estado de trámite</h2>
            <div className={styles.retentionChart}>
              <div
                className={styles.donut}
                style={
                  {
                    '--donut-fill': filtered.length
                      ? '#001f4d 0 35%, #ff8319 35% 70%, #4f6da8 70% 88%, #c9181f 88% 100%'
                      : '#dfe5f7 0 100%',
                  } as CSSProperties
                }
              >
                <strong>{filtered.length}</strong>
                <small>Total visible</small>
              </div>
              <ul>
                {counts.map((item) => (
                  <li key={item.label}>
                    <i style={{ background: item.color }} />
                    {item.label}
                    <b>{item.count}</b>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </details>

      <details className={styles.reportModule} open>
        <summary>
          <LockKeyhole size={19} />
          <span>
            <strong>Trazabilidad y control de documentación</strong>
            <small>Vista de expedientes accesibles para el usuario autenticado</small>
          </span>
          <span className={styles.badgeWarning}>Confidencial</span>
        </summary>
        <div className={styles.reportTableWrap}>
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Expediente</th>
                <th>Unidad</th>
                <th>Responsable</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 5).map((item) => (
                <tr key={item.dossierId}>
                  <td>{new Date(item.createdAt).toLocaleString('es-DO')}</td>
                  <td>
                    <strong>{item.code}</strong>
                    <br />
                    {item.title}
                  </td>
                  <td>{item.schoolCode}</td>
                  <td>{item.createdBy.name}</td>
                  <td>{item.currentState.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className={styles.emptyRow}>
              No existen expedientes para los filtros seleccionados.
            </p>
          )}
        </div>
      </details>

      <details className={styles.reportModule}>
        <summary>
          <Truck size={19} />
          <span>
            <strong>Próximas remesas y transferencias secundarias</strong>
            <small>Calendario de migración hacia Archivo Central y AGN</small>
          </span>
          <span>Minimizar / desplegar</span>
        </summary>
        <div className={styles.emptyRow}>
          <Truck size={28} />
          <p>
            La programación de remesas permanecerá deshabilitada hasta que backend publique su
            contrato oficial.
          </p>
          <button className={styles.button} disabled>
            Programar nueva remesa
          </button>
        </div>
      </details>
    </div>
  );
}
