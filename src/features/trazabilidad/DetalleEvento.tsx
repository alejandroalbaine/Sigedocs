import { Dialog } from '../../common/components/Dialog/Dialog.tsx';
import { formatDateTime } from '../../common/utils/format.ts';
import type { EventoTrazabilidad } from './catalogos.ts';
import { EtiquetaAccion } from './TablaEventos.tsx';
import styles from './trazabilidad.module.css';

export interface DetalleEventoProps {
  evento: EventoTrazabilidad | null;
  onCerrar: () => void;
}

/** Detalle del evento con los campos que el contrato B7 publica realmente. */
export function DetalleEvento({ evento, onCerrar }: DetalleEventoProps) {
  return (
    <Dialog open={evento !== null} title="Detalle del evento" onClose={onCerrar}>
      {evento && (
        <>
          <EtiquetaAccion accion={evento.accion} />
          <dl className={styles.detail}>
            <dt>Expediente</dt>
            <dd>
              <strong>{evento.expedienteTitulo}</strong> ({evento.expedienteCodigo})
            </dd>
            <dt>Fecha y hora</dt>
            <dd>{formatDateTime(evento.fecha)}</dd>
            <dt>Usuario</dt>
            <dd>{evento.usuarioNombre}</dd>
            <dt>Versión</dt>
            <dd>{evento.version || '—'}</dd>
            <dt>Detalle</dt>
            <dd>{evento.observacion}</dd>
            <dt>Registro</dt>
            <dd>#{evento.id}</dd>
          </dl>
        </>
      )}
    </Dialog>
  );
}
