import { useMemo, useState, type CSSProperties } from 'react';
import {
  BarChart3,
  CircleCheck,
  Download,
  FileStack,
  Info,
  LockKeyhole,
  RotateCcw,
  SearchCheck,
} from 'lucide-react';
import { downloadCsv } from '../../common/utils/download.ts';
import { useDossiers } from '../documental/useDossiers.ts';
import { contarPorGrupo, GRUPOS_ESTADO, segmentosDona } from '../../common/workflow/estados.ts';
import styles from '../documental/documental.module.css';

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
  const conteo = contarPorGrupo(filtered.map((item) => item.currentState.code));
  const legend = GRUPOS_ESTADO.filter((group) => group.id !== 'otros' || conteo.otros > 0);
  const total = filtered.length;
  const share = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

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
            Seguimiento <span className={styles.badge}>RF-15</span>
          </p>
          <h1>Reportes y estadísticas</h1>
          <p>
            Estado, volumen y avance de los expedientes curriculares visibles según su rol y
            alcance.
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
        <Info size={17} /> Cifras calculadas con los expedientes que el servidor autoriza para su
        usuario.
      </div>
      <section className={styles.metrics} aria-label="Indicadores de auditoría">
        {(
          [
            [FileStack, 'Expedientes visibles', total, 'Según periodo y unidad'],
            [SearchCheck, 'En revisión', conteo.revision, 'Revisión y reevaluación'],
            [RotateCcw, 'Requieren ajustes', conteo.ajustes, 'Devueltos con observaciones'],
            [CircleCheck, 'Definitivos', conteo.cierre, 'Versión definitiva o archivada'],
          ] as const
        ).map(([MetricIcon, label, value, description], index) => (
          <article className={styles.metric} key={label}>
            <MetricIcon size={23} />
            <span>{label}</span>
            <strong>{value}</strong>
            <small className={styles.subtle}>{description}</small>
            <div className={styles.metricLine}>
              <i style={{ width: `${index === 0 ? (total ? 100 : 0) : share(value)}%` }} />
            </div>
          </article>
        ))}
      </section>

      <details className={styles.reportModule} open>
        <summary>
          <BarChart3 size={19} />
          <span>
            <strong>Análisis gráfico y tendencias</strong>
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
                style={{ '--donut-fill': segmentosDona(conteo) } as CSSProperties}
              >
                <strong>{filtered.length}</strong>
                <small>Total visible</small>
              </div>
              <ul>
                {legend.map((group) => (
                  <li key={group.id}>
                    <i style={{ background: group.color }} />
                    {group.etiqueta}
                    <b>{conteo[group.id]}</b>
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
            <strong>Expedientes del periodo</strong>
            <small>Vista de solo lectura de los expedientes accesibles para su usuario</small>
          </span>
          <span className={styles.badge}>Solo lectura</span>
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
    </div>
  );
}
