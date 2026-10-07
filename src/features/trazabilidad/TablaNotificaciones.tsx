import { DataTable, type Column } from '../../common/components/DataTable/DataTable.tsx';
import { formatDateTime } from '../../common/utils/format.ts';
import { BadgeNotificacion } from './BadgeNotificacion.tsx';
import type { EstadoEnvio, HistorialItem } from '../../types/trazabilidad.ts';

interface FilaNotificacion {
  clave: string;
  fecha: string;
  cambio: string;
  email: string | null;
  status: EstadoEnvio;
}

/** Una fila por destinatario: cada correo muestra su propio estado de envío. */
function filasDe(items: readonly HistorialItem[]): FilaNotificacion[] {
  return items.flatMap<FilaNotificacion>((item) => {
    const cambio =
      item.estadoAnterior && item.estadoNuevo
        ? `${item.estadoAnterior} → ${item.estadoNuevo}`
        : (item.type ?? item.summary ?? '—');
    if (item.destinatarios.length === 0) {
      return [
        {
          clave: `${item.notificationId}#sin-destinatarios`,
          fecha: item.occurredAt,
          cambio,
          email: null,
          status: 'en_preparacion' as const,
        },
      ];
    }
    return item.destinatarios.map((destinatario, indice) => ({
      clave: `${item.notificationId}#${indice}`,
      fecha: item.occurredAt,
      cambio,
      email: destinatario.email,
      status: destinatario.status,
    }));
  });
}

export interface TablaNotificacionesProps {
  items: readonly HistorialItem[];
  vacio: string;
}

export function TablaNotificaciones({ items, vacio }: TablaNotificacionesProps) {
  const filas = filasDe(items);
  const columnas: Column<FilaNotificacion>[] = [
    {
      key: 'fecha',
      header: 'Fecha y hora',
      render: (fila) => formatDateTime(fila.fecha),
    },
    { key: 'cambio', header: 'Cambio de estado', render: (fila) => fila.cambio },
    {
      key: 'destinatario',
      header: 'Destinatario',
      render: (fila) => fila.email ?? '—',
    },
    {
      key: 'estado',
      header: 'Estado del correo',
      render: (fila) => <BadgeNotificacion status={fila.status} />,
    },
  ];

  return (
    <DataTable
      caption="Notificaciones por correo"
      columns={columnas}
      rows={filas}
      getRowKey={(fila) => fila.clave}
      emptyMessage={vacio}
      minWidth={640}
    />
  );
}
