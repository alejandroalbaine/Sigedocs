import { Dialog } from '../../common/components/Dialog/Dialog.tsx';
import { formatDateTime } from '../../common/utils/format.ts';
import { DetalleErrorNotificacion, NotificacionEvento } from './BadgeNotificacion.tsx';
import type { EventoTrazabilidad } from './catalogos.ts';
import { EtiquetaAccion, TransicionEstado } from './TablaEventos.tsx';
import styles from './trazabilidad.module.css';

export interface DetalleEventoProps {
  evento: EventoTrazabilidad | null;
  onCerrar: () => void;
}

export function DetalleEvento({ evento, onCerrar }: DetalleEventoProps) {
  return (
    <Dialog open={evento !== null} title="Detalle del evento" onClose={onCerrar}>
      {evento && (
        <>
          <EtiquetaAccion accion={evento.accion} />
          <dl className={styles.detail}>
            <dt>Expediente</dt>
            <dd>
              {evento.expedienteTitulo ? (
                <>
                  <strong>{evento.expedienteTitulo}</strong> ({evento.expedienteCodigo})
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt>Fecha y hora</dt>
            <dd>{formatDateTime(evento.fecha)}</dd>
            <dt>Usuario</dt>
            <dd>
              {evento.usuarioNombre}
              {evento.usuarioCorreo ? ` · ${evento.usuarioCorreo}` : ''}
            </dd>
            <dt>Rol</dt>
            <dd>{evento.usuarioRol || '—'}</dd>
            <dt>Versión</dt>
            <dd>{evento.version || '—'}</dd>
            <dt>Estado</dt>
            <dd>
              <TransicionEstado evento={evento} />
            </dd>
            <dt>Notificación por correo</dt>
            <dd>
              <NotificacionEvento notificacion={evento.notificacion} />
              <DetalleErrorNotificacion notificacion={evento.notificacion} />
            </dd>
            <dt>Observación</dt>
            <dd>{evento.observacion ?? 'Sin observaciones'}</dd>
            <dt>Evidencia</dt>
            <dd>{evento.evidencia ?? '—'}</dd>
            <dt>Registro</dt>
            <dd>#{evento.id}</dd>
          </dl>
        </>
      )}
    </Dialog>
  );
}
