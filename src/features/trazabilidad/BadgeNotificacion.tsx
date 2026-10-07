import { Clock, Hourglass, MailCheck, MailWarning, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '../../common/components/Badge/Badge.tsx';
import type { EstadoEnvioCorreo, NotificacionCorreo } from './catalogos.ts';
import styles from './trazabilidad.module.css';

/** El aviso que se muestra en la columna cuando el backend aún no informa del envío. */
const SIN_DETALLE = 'en_preparacion' as const satisfies EstadoEnvioCorreo;

const ESTADOS_ENVIO = {
  sent: { etiqueta: 'Enviado', tono: 'success', Icono: MailCheck },
  pending: { etiqueta: 'Pendiente de envío', tono: 'warning', Icono: Clock },
  failed: { etiqueta: 'No se pudo enviar', tono: 'danger', Icono: MailWarning },
  en_preparacion: { etiqueta: 'En preparación', tono: 'neutral', Icono: Hourglass },
} as const satisfies Record<
  EstadoEnvioCorreo,
  { etiqueta: string; tono: BadgeTone; Icono: LucideIcon }
>;

/** Destinatarios visibles como píldoras antes de resumir el resto. */
const MAX_PILDORAS = 2;

export interface BadgeNotificacionProps {
  /** Acepta `undefined` mientras el evento no declare aviso; degrada a «En preparación». */
  notificacion?: NotificacionCorreo | null | undefined;
}

/** Distintivo del estado del correo: enviado, pendiente, fallido o en preparación. */
export function BadgeNotificacion({ notificacion }: BadgeNotificacionProps) {
  const { etiqueta, tono, Icono } = ESTADOS_ENVIO[notificacion?.estado ?? SIN_DETALLE];
  return (
    <Badge tone={tono}>
      <Icono size={13} aria-hidden="true" />
      {etiqueta}
    </Badge>
  );
}

export interface DestinatariosNotificacionProps {
  /** Acepta `undefined` mientras el evento no declare aviso; degrada a «En preparación». */
  notificacion?: NotificacionCorreo | null | undefined;
}

/** Píldoras con los correos notificados; si hay más de dos, el resto queda desplegable. */
export function DestinatariosNotificacion({ notificacion }: DestinatariosNotificacionProps) {
  const destinatarios =
    notificacion?.estado === SIN_DETALLE ? [] : (notificacion?.destinatarios ?? []);
  if (destinatarios.length === 0) {
    return <span className={styles.muted}>El detalle del envío aún no está disponible.</span>;
  }

  const visibles = destinatarios.slice(0, MAX_PILDORAS);
  const resto = destinatarios.slice(MAX_PILDORAS);
  return (
    <div className={styles.destinatarios}>
      <ul className={styles.pildoras}>
        {visibles.map((correo) => (
          <li key={correo} className={styles.pildora} title={correo}>
            {correo}
          </li>
        ))}
      </ul>
      {resto.length > 0 && (
        <details className={styles.mas}>
          <summary>+{resto.length} más</summary>
          <ul className={styles.pildoras}>
            {resto.map((correo) => (
              <li key={correo} className={styles.pildora} title={correo}>
                {correo}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export type NotificacionEventoProps = BadgeNotificacionProps;

/** Bloque «Notificados» de una fila o ficha: estado del envío más sus destinatarios. */
export function NotificacionEvento({ notificacion }: NotificacionEventoProps) {
  return (
    <div className={styles.notificacion}>
      <BadgeNotificacion notificacion={notificacion} />
      <DestinatariosNotificacion notificacion={notificacion} />
    </div>
  );
}
