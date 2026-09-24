import { useState } from 'react';
import { roleLabels, useCurrentUser, useSession } from '../../common/auth/SessionContext.ts';
import { BarChart, type BarSeries } from '../../common/charts/BarChart.tsx';
import { DoughnutChart } from '../../common/charts/DoughnutChart.tsx';
import {
  Alert,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Pagination,
  type Column,
} from '../../common/components/index.ts';
import { totalPages } from '../../common/utils/pagination.ts';
import { formatLongDate } from '../../common/utils/format.ts';
import styles from './DashboardPage.module.css';
import page from '../layout/page.module.css';

/*
 * El backend todavía no publica un contrato para métricas, actividad ni alertas. La pantalla
 * muestra la estructura en cero y no inventa registros. Cuando exista el contrato, estos
 * valores vendrán del cliente de API con su propio validador en contract.ts.
 */
interface Metrica {
  label: string;
  title: string;
  icon: string;
  value: number;
}

interface Actividad {
  codigo: string;
  titulo: string;
  serie: string;
  unidad: string;
  responsable: string;
}

interface AlertaTrd {
  titulo: string;
  texto: string;
}

const METRICAS: readonly Metrica[] = [
  { label: 'Expedientes', title: 'Documentos recibidos', icon: '▣', value: 0 },
  { label: 'Trámites', title: 'En proceso de revisión', icon: '◷', value: 0 },
  { label: 'Alertas', title: 'Vencimientos TRD', icon: '!', value: 0 },
  { label: 'Actividad', title: 'Acciones registradas', icon: '◇', value: 0 },
];

const MENSUAL: { categorias: readonly string[]; series: readonly BarSeries[] } = {
  categorias: [],
  series: [
    { label: 'Planes de estudio', values: [] },
    { label: 'Reglamentos y actas', values: [] },
  ],
};

const ESTADOS: { etiquetas: readonly string[]; valores: readonly number[] } = {
  etiquetas: [],
  valores: [],
};

const ACTIVIDAD: readonly Actividad[] = [];
const ALERTAS: readonly AlertaTrd[] = [];
const POR_PAGINA = 6;

const COLUMNAS: readonly Column<Actividad>[] = [
  {
    key: 'codigo',
    header: 'Código',
    render: (fila) => <span className={styles.code}>{fila.codigo}</span>,
  },
  { key: 'titulo', header: 'Título del documento', render: (fila) => fila.titulo },
  { key: 'serie', header: 'Serie documental', render: (fila) => fila.serie },
  { key: 'unidad', header: 'Unidad de origen', render: (fila) => fila.unidad },
  { key: 'responsable', header: 'Responsable', render: (fila) => fila.responsable },
];

function ActividadReciente() {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const consulta = busqueda.trim().toLocaleLowerCase('es');
  const filas = ACTIVIDAD.filter((fila) =>
    Object.values(fila).join(' ').toLocaleLowerCase('es').includes(consulta),
  );
  const paginaActual = Math.min(pagina, totalPages(filas.length, POR_PAGINA));
  const visibles = filas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  return (
    <Card
      title="Actividad reciente"
      description="Últimos expedientes modificados, radicados y transferidos."
      actions={
        <input
          className={styles.search}
          type="search"
          aria-label="Filtrar la actividad reciente"
          placeholder="Filtrar por código…"
          value={busqueda}
          onChange={(event) => {
            setBusqueda(event.target.value);
            setPagina(1);
          }}
        />
      }
    >
      <DataTable
        caption="Actividad reciente en el sistema"
        columns={COLUMNAS}
        rows={visibles}
        getRowKey={(fila) => fila.codigo}
        emptyMessage="Sin registros disponibles."
        minWidth={680}
      />
      <Pagination
        page={paginaActual}
        pageSize={POR_PAGINA}
        total={filas.length}
        itemLabel="registros"
        onPageChange={setPagina}
      />
    </Card>
  );
}

export function DashboardPage() {
  const user = useCurrentUser();
  const { roleNames } = useSession();
  const roles = roleLabels(user, roleNames) || 'Usuario institucional';
  const totalEstados = ESTADOS.valores.reduce((suma, valor) => suma + valor, 0);

  return (
    <div className={page.stack}>
      <title>Panel principal | SIGESDOC</title>
      <PageHeader
        eyebrow="Panel principal"
        title={`Bienvenido/a, ${user.name}`}
        description={`${roles} · ${formatLongDate(new Date())}`}
      />

      {user.permissions.length === 0 ? (
        <EmptyState title="No tiene módulos asignados">
          Su sesión está activa, pero su cuenta no tiene permisos sobre ningún módulo. Si necesita
          acceso, solicítelo a la Mesa de Ayuda TI.
        </EmptyState>
      ) : (
        <>
          <Alert kind="info">
            Las métricas, la actividad y las alertas se mostrarán cuando el backend publique el
            contrato de expedientes. Mientras tanto se muestran en cero; no hay datos simulados.
          </Alert>

          <ul className={styles.metrics} aria-label="Indicadores">
            {METRICAS.map((metrica) => (
              <li key={metrica.label} className={styles.metric}>
                <p className={styles.metricLabel}>{metrica.label}</p>
                <p className={styles.metricTitle}>{metrica.title}</p>
                <span className={styles.metricIcon} aria-hidden="true">
                  {metrica.icon}
                </span>
                <p className={styles.metricValue}>{metrica.value}</p>
                <p className={styles.metricDetail}>Sin datos del backend</p>
              </li>
            ))}
          </ul>

          <div className={styles.grid}>
            <Card
              title="Ingreso y radicación mensual"
              description="Histórico comparativo por tipología documental."
            >
              <BarChart
                label="Documentos ingresados por mes"
                categories={MENSUAL.categorias}
                series={MENSUAL.series}
              />
              <ul className={styles.legend}>
                {MENSUAL.series.map((serie, index) => (
                  <li key={serie.label}>
                    <span className={`${styles.dot} ${styles[`dot${index + 1}`]}`} />
                    {serie.label}
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Estado de trámite" description="Ciclo de vida de los expedientes.">
              <div className={styles.doughnut}>
                <DoughnutChart label="Expedientes por estado" values={ESTADOS.valores} />
                {totalEstados > 0 && (
                  <div className={styles.total}>
                    <strong>{totalEstados}</strong>
                    <span>Total TRD</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className={styles.grid}>
            <ActividadReciente />
            <Card title="Alertas TRD" description="Vencimientos según la Tabla de Retención.">
              {ALERTAS.length === 0 ? (
                <EmptyState title="Sin alertas">No hay alertas registradas.</EmptyState>
              ) : (
                <ul>
                  {ALERTAS.map((alerta) => (
                    <li key={alerta.titulo}>
                      <strong>{alerta.titulo}</strong> {alerta.texto}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
