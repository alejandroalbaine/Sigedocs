import { useState } from 'react';
import { dossiersApi } from '../../common/api/dossiers.ts';
import type { AuditEvent } from '../../common/api/dossierContract.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import {
  Alert,
  Card,
  PageHeader,
  Pagination,
  type SortState,
} from '../../common/components/index.ts';
import { totalPages } from '../../common/utils/pagination.ts';
import { FILTROS_VACIOS, type FiltrosTrazabilidad } from '../../features/trazabilidad/catalogos.ts';
import {
  consultaServidor,
  filtrarPorTexto,
  ordenarEventos,
} from '../../features/trazabilidad/consulta.ts';
import { DetalleEvento } from '../../features/trazabilidad/DetalleEvento.tsx';
import { FiltrosTrazabilidad as Filtros } from '../../features/trazabilidad/FiltrosTrazabilidad.tsx';
import { TablaEventos } from '../../features/trazabilidad/TablaEventos.tsx';
import { EnPreparacion } from '../documental/EnPreparacion.tsx';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from '../layout/page.module.css';

const TAMANOS = [10, 20, 50] as const;

/** AUD-01: la trazabilidad se consulta por expediente con `GET /dossiers/{id}/audit-events`. */
function Historial() {
  const { items, loading, error, pendiente } = useDossiers();
  const [elegido, setElegido] = useState('');
  const [filtros, setFiltros] = useState<FiltrosTrazabilidad>(FILTROS_VACIOS);
  const [orden, setOrden] = useState<SortState>({ key: 'fecha', direction: 'desc' });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(20);
  const [seleccionado, setSeleccionado] = useState<AuditEvent | null>(null);
  const dossier = items.find((item) => item.dossierId === elegido) ?? items[0];
  const consulta = consultaServidor(filtros);
  const eventos = useRecurso(
    dossier ? () => dossiersApi.auditEvents(dossier.dossierId, consulta) : null,
    [dossier?.dossierId, consulta],
  );

  if (loading) return <p>Consultando expedientes…</p>;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (pendiente) return <EnPreparacion />;
  if (!dossier) {
    return <Alert kind="info">No hay expedientes visibles para consultar su trazabilidad.</Alert>;
  }

  const resultado = ordenarEventos(filtrarPorTexto(eventos.data ?? [], filtros.texto), orden);
  const paginaActual = Math.min(pagina, totalPages(resultado.length, porPagina));
  const visibles = resultado.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <>
      <Card title="Filtros y búsqueda">
        <Filtros
          expedientes={items}
          expediente={dossier.dossierId}
          onExpediente={(id) => {
            setElegido(id);
            setPagina(1);
          }}
          onAplicar={(siguientes) => {
            setFiltros(siguientes);
            setPagina(1);
          }}
        />
      </Card>
      <Card
        title={`Eventos de ${dossier.code}`}
        description="Quién hizo cada acción, cuándo, sobre qué versión y con qué efecto."
      >
        {eventos.pendiente ? (
          <EnPreparacion modulo="El historial de auditoría" />
        ) : eventos.error ? (
          <Alert kind="error">{eventos.error}</Alert>
        ) : (
          <>
            <TablaEventos
              eventos={visibles}
              orden={orden}
              vacio={eventos.loading ? 'Consultando eventos…' : 'No hay eventos para los filtros.'}
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
          </>
        )}
      </Card>
      <DetalleEvento
        evento={seleccionado}
        expediente={`${dossier.code} · ${dossier.title}`}
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
