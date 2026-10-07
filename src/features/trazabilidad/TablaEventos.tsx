import type { AuditEvent } from '../../common/api/dossierContract.ts';
import { Badge } from '../../common/components/Badge/Badge.tsx';
import { Button } from '../../common/components/Button/Button.tsx';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../common/components/DataTable/DataTable.tsx';
import { formatDateTime } from '../../common/utils/format.ts';
import { describirTipo } from './catalogos.ts';

export function EtiquetaTipo({ tipo }: { tipo: string }) {
  const { etiqueta, tono } = describirTipo(tipo);
  return <Badge tone={tono}>{etiqueta}</Badge>;
}

export interface TablaEventosProps {
  eventos: readonly AuditEvent[];
  orden: SortState;
  onOrdenar: (columna: string) => void;
  onVerDetalle: (evento: AuditEvent) => void;
  vacio: string;
}

export function TablaEventos({
  eventos,
  orden,
  onOrdenar,
  onVerDetalle,
  vacio,
}: TablaEventosProps) {
  const columnas: Column<AuditEvent>[] = [
    {
      key: 'fecha',
      header: 'Fecha y hora',
      sortable: true,
      render: (evento) => formatDateTime(evento.occurredAt),
    },
    {
      key: 'tipo',
      header: 'Evento',
      sortable: true,
      render: (evento) => <EtiquetaTipo tipo={evento.type} />,
    },
    { key: 'usuario', header: 'Usuario', sortable: true, render: (evento) => evento.user.name },
    {
      key: 'version',
      header: 'Versión',
      sortable: true,
      render: (evento) => evento.versionLabel ?? '—',
    },
    { key: 'resumen', header: 'Resumen', render: (evento) => evento.summary },
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
      getRowKey={(evento) => evento.eventId}
      emptyMessage={vacio}
      minWidth={820}
      sort={orden}
      onSort={onOrdenar}
    />
  );
}
