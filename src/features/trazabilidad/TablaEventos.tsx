import { Badge } from '../../common/components/Badge/Badge.tsx';
import { Button } from '../../common/components/Button/Button.tsx';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../common/components/DataTable/DataTable.tsx';
import { formatDateTime } from '../../common/utils/format.ts';
import { TIPOS_AUDITORIA, describir, type EventoTrazabilidad } from './catalogos.ts';
import styles from './trazabilidad.module.css';

/**
 * `accion` es el `type` del contrato B7, que solo emite seis valores. Si el backend
 * publica uno nuevo, `describir` lo muestra tal cual en lugar de romper la columna.
 */
export function EtiquetaAccion({ accion }: { accion: string }) {
  const { etiqueta, tono } = describir(TIPOS_AUDITORIA, accion);
  return <Badge tone={tono}>{etiqueta}</Badge>;
}

export interface TablaEventosProps {
  eventos: readonly EventoTrazabilidad[];
  orden: SortState;
  onOrdenar: (columna: string) => void;
  onVerDetalle: (evento: EventoTrazabilidad) => void;
}

/**
 * El contrato B7 no incluye correo ni rol del actor ni los estados anterior/nuevo, así
 * que la tabla muestra el `summary` del servidor, que es el detalle real del evento.
 */
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
      render: (evento) => (
        <>
          <span className={styles.cellTitle}>{evento.expedienteCodigo}</span>
          <span className={styles.cellSub} title={evento.expedienteTitulo}>
            {evento.expedienteTitulo}
          </span>
        </>
      ),
    },
    {
      key: 'usuarioNombre',
      header: 'Usuario',
      sortable: true,
      render: (evento) => (
        <span className={styles.cellTitle}>{evento.usuarioNombre}</span>
      ),
    },
    { key: 'version', header: 'Versión', sortable: true, render: (evento) => evento.version || '—' },
    {
      key: 'observacion',
      header: 'Detalle',
      render: (evento) => <span className={styles.cellSub}>{evento.observacion}</span>,
    },
    {
      key: 'detalle',
      header: 'Ver',
      render: (evento) => (
        <Button
          variant="text"
          onClick={() => {
            onVerDetalle(evento);
          }}
        >
          Detalle
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
      minWidth={900}
      sort={orden}
      onSort={onOrdenar}
    />
  );
}
