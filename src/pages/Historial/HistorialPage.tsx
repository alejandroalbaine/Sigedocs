import { useState } from 'react';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import {
  Alert,
  Card,
  PageHeader,
  Pagination,
  type SortState,
} from '../../common/components/index.ts';
import { totalPages } from '../../common/utils/pagination.ts';
import {
  FILTROS_VACIOS,
  type EventoTrazabilidad,
  type FiltrosTrazabilidad,
} from '../../features/trazabilidad/catalogos.ts';
import { filtrarEventos, ordenarEventos } from '../../features/trazabilidad/consulta.ts';
import { DetalleEvento } from '../../features/trazabilidad/DetalleEvento.tsx';
import { FiltrosTrazabilidad as Filtros } from '../../features/trazabilidad/FiltrosTrazabilidad.tsx';
import { TablaEventos } from '../../features/trazabilidad/TablaEventos.tsx';
import styles from '../layout/page.module.css';

const TAMANOS = [10, 20, 50] as const;

/**
 * Sin contrato de trazabilidad no hay eventos. Cuando el backend publique
 * `GET /api/v1/dossiers/{dossierId}/audit-events`, esta lista vendrá del cliente de API
 * y la pantalla no necesita otros cambios.
 */
const EVENTOS: readonly EventoTrazabilidad[] = [];

function Historial() {
  const [filtros, setFiltros] = useState<FiltrosTrazabilidad>(FILTROS_VACIOS);
  const [orden, setOrden] = useState<SortState>({ key: 'fecha', direction: 'desc' });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(20);
  const [seleccionado, setSeleccionado] = useState<EventoTrazabilidad | null>(null);

  const resultado = ordenarEventos(filtrarEventos(EVENTOS, filtros), orden);
  const paginaActual = Math.min(pagina, totalPages(resultado.length, porPagina));
  const visibles = resultado.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <>
      <Alert kind="info">
        La trazabilidad se consulta por expediente. Seleccione uno desde Gestión documental cuando
        la ruta de auditoría esté habilitada.
      </Alert>
      <Card title="Filtros y búsqueda">
        <Filtros
          onAplicar={(siguientes) => {
            setFiltros(siguientes);
            setPagina(1);
          }}
        />
      </Card>
      <Card
        title="Eventos"
        description="Usuario, fecha, acción, versión, estado anterior → nuevo, observación y evidencia."
      >
        <TablaEventos
          eventos={visibles}
          orden={orden}
          onOrdenar={(columna) => {
            setOrden((actual) => ({
              key: columna,
              direction: actual.key === columna && actual.direction === 'desc' ? 'asc' : 'desc',
            }));
          }}
          onVerDetalle={setSeleccionado}
        />
        <Pagination
          page={paginaActual}
          pageSize={porPagina}
          total={resultado.length}
          itemLabel="eventos"
          onPageChange={setPagina}
          pageSizeOptions={TAMANOS}
          onPageSizeChange={(tamano: number) => {
            setPorPagina(tamano);
            setPagina(1);
          }}
        />
      </Card>
      <DetalleEvento
        evento={seleccionado}
        onCerrar={() => {
          setSeleccionado(null);
        }}
      />
    </>
  );
}

export function HistorialPage() {
  return (
    <div className={styles.stack}>
      <title>Historial y trazabilidad | SIGESDOC</title>
      <PageHeader
        eyebrow="Auditoría"
        title="Historial y trazabilidad"
        description="Cronología auditable de las acciones sobre los expedientes curriculares."
      />
      <RequirePermission permission="audit.read" action="consultar la trazabilidad">
        <Historial />
      </RequirePermission>
    </div>
  );
}
