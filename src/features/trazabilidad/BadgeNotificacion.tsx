import { Clock, Hourglass, MailCheck, MailWarning, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '../../common/components/Badge/Badge.tsx';
import { ETIQUETAS_ESTADO_ENVIO, type EstadoEnvio } from '../../types/trazabilidad.ts';

const ESTADOS_VISUALES = {
  sent: { tono: 'success', Icono: MailCheck },
  pending: { tono: 'warning', Icono: Clock },
  failed: { tono: 'danger', Icono: MailWarning },
  en_preparacion: { tono: 'neutral', Icono: Hourglass },
} as const satisfies Record<EstadoEnvio, { tono: BadgeTone; Icono: LucideIcon }>;

export interface BadgeNotificacionProps {
  /** Estado individual del correo de un destinatario (`sent`, `pending`, `failed`). */
  status: EstadoEnvio;
}

/** Distintivo del estado del correo de un destinatario, sin detalle técnico alguno. */
export function BadgeNotificacion({ status }: BadgeNotificacionProps) {
  const { tono, Icono } = ESTADOS_VISUALES[status];
  return (
    <Badge tone={tono}>
      <Icono size={13} aria-hidden="true" />
      {ETIQUETAS_ESTADO_ENVIO[status]}
    </Badge>
  );
}
