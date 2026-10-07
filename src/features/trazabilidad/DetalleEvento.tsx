import type { AuditEvent } from '../../common/api/dossierContract.ts';
import { Dialog } from '../../common/components/Dialog/Dialog.tsx';
import { formatDateTime } from '../../common/utils/format.ts';
import { EtiquetaTipo } from './TablaEventos.tsx';
import styles from './trazabilidad.module.css';

export interface DetalleEventoProps {
  evento: AuditEvent | null;
  expediente: string;
  onCerrar: () => void;
}

export function DetalleEvento({ evento, expediente, onCerrar }: DetalleEventoProps) {
  return (
    <Dialog open={evento !== null} title="Detalle del evento" onClose={onCerrar}>
      {evento && (
        <>
          <EtiquetaTipo tipo={evento.type} />
          <dl className={styles.detail}>
            <dt>Expediente</dt>
            <dd>{expediente}</dd>
            <dt>Fecha y hora</dt>
            <dd>{formatDateTime(evento.occurredAt)}</dd>
            <dt>Usuario</dt>
            <dd>{evento.user.name}</dd>
            <dt>Versión</dt>
            <dd>{evento.versionLabel ?? '—'}</dd>
            <dt>Resumen</dt>
            <dd>{evento.summary}</dd>
            <dt>Registro</dt>
            <dd>#{evento.eventId}</dd>
          </dl>
        </>
      )}
    </Dialog>
  );
}
