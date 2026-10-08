import { useEffect, useState } from 'react';
import { dossiersApi } from '../../common/api/dossiers.ts';
import type { AuditEvent } from '../../common/api/dossierContract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
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
import { TablaNotificaciones } from '../../features/trazabilidad/TablaNotificaciones.tsx';
import { consultarNotificaciones, fueraDeAlcance } from '../../services/trazabilidadService.ts';
import type { HistorialItem } from '../../types/trazabilidad.ts';
import { EnPreparacion } from '../documental/EnPreparacion.tsx';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from '../layout/page.module.css';

const TAMANOS = [10, 20, 50] as const;

type EstadoNotificaciones =
  | { dossierId: string; estado: 'ok'; items: HistorialItem[] }
  | { dossierId: string; estado: 'error'; mensaje: string }
  | null;

/** AUD-01: la cronología se consulta por expediente con `GET /dossiers/{id}/audit-events`. */

/** ADR-015: el administrador del sistema no consulta expedientes curriculares. */
function SinExpedientes() {
  return (
    <Alert kind="info">
      Su rol no consulta expedientes curriculares, por eso esta sección no muestra información.
    </Alert>
  );
}

function Historial() {
  const user = useCurrentUser();
  const canRead = hasPermission(user.permissions, 'dossiers.read');
  const { items, loading, error, pendiente } = useDossiers('', canRead);
  const [elegido, setElegido] = useState('');
  const [filtros, setFiltros] = useState<FiltrosTrazabilidad>(FILTROS_VACIOS);
  const [orden, setOrden] = useState<SortState>({ key: 'fecha', direction: 'desc' });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(20);
  const [seleccionado, setSeleccionado] = useState<AuditEvent | null>(null);
  const dossier = items.find((item) => item.dossierId === elegido) ?? null;
  const dossierId = dossier?.dossierId ?? '';
  const consulta = consultaServidor(filtros);
  const eventos = useRecurso(
    dossier ? () => dossiersApi.auditEvents(dossier.dossierId, consulta) : null,
    [dossier?.dossierId, consulta],
  );

  const [notificaciones, setNotificaciones] = useState<EstadoNotificaciones>(null);

  useEffect(() => {
    if (!dossierId) return;
    let activo = true;
    consultarNotificaciones(dossierId)
      .then((items) => {
        if (activo) setNotificaciones({ dossierId, estado: 'ok', items });
      })
      .catch((motivo: unknown) => {
        if (!activo) return;
        setNotificaciones({
          dossierId,
          estado: 'error',
          mensaje: fueraDeAlcance(motivo)
            ? 'Expediente no encontrado o fuera del alcance del usuario.'
            : errorMessage(
                motivo,
                'No fue posible consultar las notificaciones por correo del expediente.',
              ),
        });
      });
    return () => {
      activo = false;
    };
  }, [dossierId]);

  const estadoNotificaciones =
    notificaciones && notificaciones.dossierId === dossierId ? notificaciones : null;

  if (!canRead) return <SinExpedientes />;
  if (loading) return <p>Consultando expedientes…</p>;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (pendiente) return <EnPreparacion />;
  if (items.length === 0) {
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
          expediente={dossierId}
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
      {!dossier ? (
        <Alert kind="info">Seleccione un expediente para continuar.</Alert>
      ) : (
        <>
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
                  vacio={
                    eventos.loading ? 'Consultando eventos…' : 'No hay eventos para los filtros.'
                  }
                  onOrdenar={(columna) => {
                    setOrden((actual) => ({
                      key: columna,
                      direction:
                        actual.key === columna && actual.direction === 'desc' ? 'asc' : 'desc',
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
          <Card
            title="Notificaciones por correo"
            description="Cada cambio de estado y el estado del correo de cada destinatario."
          >
            {estadoNotificaciones?.estado === 'error' ? (
              <Alert kind="error">{estadoNotificaciones.mensaje}</Alert>
            ) : estadoNotificaciones === null ? (
              <p>Consultando notificaciones…</p>
            ) : estadoNotificaciones.items.length === 0 ? (
              <p>No hay notificaciones registradas para este expediente.</p>
            ) : (
              <TablaNotificaciones
                items={estadoNotificaciones.items}
                vacio="No hay notificaciones registradas para este expediente."
              />
            )}
          </Card>
        </>
      )}
      <DetalleEvento
        evento={seleccionado}
        expediente={dossier ? `${dossier.code} · ${dossier.title}` : ''}
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
