import { Badge } from '../../common/components/Badge/Badge.tsx';
import { Button } from '../../common/components/Button/Button.tsx';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../common/components/DataTable/DataTable.tsx';
import { formatDateTime } from '../../common/utils/format.ts';
import { NotificacionEvento } from './BadgeNotificacion.tsx';
import { ACCIONES, ESTADOS, describir, type EventoTrazabilidad } from './catalogos.ts';
import styles from './trazabilidad.module.css';

export function EtiquetaAccion({ accion }: { accion: string }) {
  const { etiqueta, tono } = describir(ACCIONES, accion);
  return <Badge tone={tono}>{etiqueta}</Badge>;
}

export function TransicionEstado({ evento }: { evento: EventoTrazabilidad }) {
  const nuevo = evento.estadoNuevo ? describir(ESTADOS, evento.estadoNuevo) : null;
  const anterior = evento.estadoAnterior ? describir(ESTADOS, evento.estadoAnterior) : null;
  if (!nuevo) {
    return <span className={styles.muted}>—</span>;
  }
  return (
    <span className={styles.transition}>
      {anterior ? (
        <Badge tone={anterior.tono}>{anterior.etiqueta}</Badge>
      ) : (
        <span className={styles.muted}>—</span>
      )}
      <span aria-label="pasa a">→</span>
      <Badge tone={nuevo.tono}>{nuevo.etiqueta}</Badge>
    </span>
  );
}

export interface TablaEventosProps {
  eventos: readonly EventoTrazabilidad[];
  orden: SortState;
  onOrdenar: (columna: string) => void;
  onVerDetalle: (evento: EventoTrazabilidad) => void;
}

export function TablaEventos({ eventos, orden, onOrdenar, onVerDetalle }: TablaEventosProps) {
  const columnas: Column<EventoTrazabilidad>[] = [
    {
      key: 'fecha',
      header: 'Fecha y hora',
      sortable: true,
      render: (evento) => formatDateTime(evento.fecha),
    },
    {
      key: 'accion',
      header: 'Acción',
      sortable: true,
      render: (evento) => <EtiquetaAccion accion={evento.accion} />,
    },
    {
      key: 'expedienteCodigo',
      header: 'Expediente',
      sortable: true,
      render: (evento) =>
        evento.expedienteCodigo ? (
          <>
            <span className={styles.cellTitle}>{evento.expedienteCodigo}</span>
            <span className={styles.cellSub} title={evento.expedienteTitulo}>
              {evento.expedienteTitulo}
            </span>
          </>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    {
      key: 'usuarioNombre',
      header: 'Usuario',
      sortable: true,
      render: (evento) => (
        <>
          <span className={styles.cellTitle}>{evento.usuarioNombre}</span>
          {evento.usuarioCorreo && <span className={styles.cellSub}>{evento.usuarioCorreo}</span>}
        </>
      ),
    },
    {
      key: 'version',
      header: 'Versión',
      sortable: true,
      render: (evento) => evento.version || '—',
    },
    {
      key: 'estado',
      header: 'Estado (anterior → nuevo)',
      render: (evento) => <TransicionEstado evento={evento} />,
    },
    {
      key: 'notificacion',
      header: 'Notificados',
      render: (evento) => <NotificacionEvento notificacion={evento.notificacion} />,
    },
    {
      key: 'detalle',
      header: 'Detalle',
      render: (evento) => (
        <Button
          variant="text"
          onClick={() => {
            onVerDetalle(evento);
          }}
        >
          Ver detalle
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      caption="Eventos de trazabilidad"
      columns={columnas}
      rows={eventos}
      getRowKey={(evento) => evento.id}
      emptyMessage="No hay eventos para los filtros seleccionados."
      minWidth={1080}
      sort={orden}
      onSort={onOrdenar}
    />
  );
}
