import { useEffect, useState } from 'react';
import { errorMessage } from '../../common/api/errors.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import {
  Alert,
  Card,
  Field,
  PageHeader,
  Pagination,
  type SortState,
} from '../../common/components/index.ts';
import { totalPages } from '../../common/utils/pagination.ts';
import { aEventosDesdeNotificaciones } from '../../features/trazabilidad/adaptadorAuditoria.ts';
import {
  FILTROS_VACIOS,
  type EventoTrazabilidad,
  type FiltrosTrazabilidad,
} from '../../features/trazabilidad/catalogos.ts';
import { filtrarEventos, ordenarEventos } from '../../features/trazabilidad/consulta.ts';
import { DetalleEvento } from '../../features/trazabilidad/DetalleEvento.tsx';
import { EVENTOS_SIMULADOS } from '../../features/trazabilidad/datosSimulados.ts';
import { FiltrosTrazabilidad as Filtros } from '../../features/trazabilidad/FiltrosTrazabilidad.tsx';
import { TablaEventos } from '../../features/trazabilidad/TablaEventos.tsx';
import { consultarNotificaciones } from '../../services/trazabilidadService.ts';
import { EnPreparacion } from '../documental/EnPreparacion.tsx';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from '../layout/page.module.css';

const TAMANOS = [10, 20, 50] as const;

/** ADR-015: el administrador del sistema no consulta expedientes curriculares. */
function SinExpedientes() {
  return (
    <Alert kind="info">
      Su rol no consulta expedientes curriculares, por eso esta sección no muestra información.
    </Alert>
  );
}

/**
 * La cronología se consulta expediente por expediente
 * (`GET /dossiers/{dossierId}/notifications`), así que la pantalla pide el expediente antes
 * de llamar al servicio. Mientras no hay uno seleccionado —o si la consulta falla— se muestran
 * `EVENTOS_SIMULADOS` con el aviso de rigor; si la ruta todavía no existe, se dice que el
 * historial está en preparación.
 */
function Historial() {
  const user = useCurrentUser();
  const canRead = hasPermission(user.permissions, 'dossiers.read');
  const [filtros, setFiltros] = useState<FiltrosTrazabilidad>(FILTROS_VACIOS);
  const [orden, setOrden] = useState<SortState>({ key: 'fecha', direction: 'desc' });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(20);
  const [seleccionado, setSeleccionado] = useState<EventoTrazabilidad | null>(null);

  const {
    items: expedientes,
    loading: cargandoExpedientes,
    error: errorExpedientes,
    pendiente: expedientesPendiente,
  } = useDossiers('', canRead);
  const [dossierId, setDossierId] = useState('');
  const [cronologia, setCronologia] = useState<readonly EventoTrazabilidad[] | null>(null);
  const [rutaEnPreparacion, setRutaEnPreparacion] = useState(false);
  const [errorCronologia, setErrorCronologia] = useState('');

  const expediente = expedientes.find((item) => item.dossierId === dossierId);

  useEffect(() => {
    if (!dossierId) return;
    let activo = true;
    consultarNotificaciones(dossierId)
      .then(({ items, sourceStatus }) => {
        if (!activo) return;
        setRutaEnPreparacion(sourceStatus === 'en_preparacion');
        setCronologia(
          aEventosDesdeNotificaciones(
            items,
            expediente ? { codigo: expediente.code, titulo: expediente.title } : undefined,
          ),
        );
        setErrorCronologia('');
      })
      .catch((motivo: unknown) => {
        if (!activo) return;
        setRutaEnPreparacion(false);
        setCronologia(null);
        setErrorCronologia(
          errorMessage(motivo, 'No fue posible consultar la cronología del expediente.'),
        );
      });
    return () => {
      activo = false;
    };
  }, [dossierId, expediente]);

  const conDatosReales = cronologia !== null;
  const resultado = ordenarEventos(filtrarEventos(cronologia ?? EVENTOS_SIMULADOS, filtros), orden);
  const paginaActual = Math.min(pagina, totalPages(resultado.length, porPagina));
  const visibles = resultado.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  if (!canRead) return <SinExpedientes />;
  if (cargandoExpedientes) return <p>Consultando expedientes…</p>;
  if (errorExpedientes) return <Alert kind="error">{errorExpedientes}</Alert>;
  if (expedientesPendiente) return <EnPreparacion />;

  return (
    <>
      {errorCronologia && (
        <Alert kind="error">{errorCronologia} Se siguen mostrando los eventos simulados.</Alert>
      )}
      <Card
        title="Cronología"
        description="La ruta de notificaciones devuelve los avisos de un expediente cada vez."
      >
        <Field label="Expediente consultado">
          {(control) => (
            <select
              {...control}
              value={dossierId}
              onChange={(event) => {
                setDossierId(event.target.value);
                setCronologia(null);
                setRutaEnPreparacion(false);
                setErrorCronologia('');
                setPagina(1);
              }}
            >
              <option value="">Selecciona un expediente</option>
              {expedientes.map((item) => (
                <option key={item.dossierId} value={item.dossierId}>
                  {item.code} · {item.title}
                </option>
              ))}
            </select>
          )}
        </Field>
      </Card>
      {rutaEnPreparacion ? (
        <EnPreparacion modulo="El historial de notificaciones" />
      ) : (
        <Alert kind={conDatosReales ? 'info' : 'warning'}>
          {conDatosReales
            ? 'Cronología real del expediente, consultada por GET /dossiers/{dossierId}/notifications. Cada cambio de estado notifica por correo a la persona involucrada y a Dirección y Desarrollo Curricular.'
            : 'Datos simulados: la trazabilidad real se consulta por expediente desde Gestión documental cuando el backend publique la ruta de notificaciones. Cada cambio de estado notifica por correo a la persona involucrada y a Dirección y Desarrollo Curricular.'}
        </Alert>
      )}
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
        description="Usuario, fecha, acción, versión, estado anterior → nuevo, notificados por correo, observación y evidencia."
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
