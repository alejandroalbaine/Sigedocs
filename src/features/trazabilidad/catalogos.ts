import type { BadgeTone } from '../../common/components/Badge/Badge.tsx';
import { AUDIT_EVENT_TYPES } from '../../common/api/dossierContract.ts';

/** Tipos de evento de `GET /dossiers/{id}/audit-events` (endpoints.md §9, ADR-016). */
export const TIPOS_EVENTO: Readonly<
  Record<(typeof AUDIT_EVENT_TYPES)[number], { etiqueta: string; tono: BadgeTone }>
> = {
  dossier_created: { etiqueta: 'Expediente creado', tono: 'info' },
  version_created: { etiqueta: 'Versión creada', tono: 'info' },
  content_updated: { etiqueta: 'Contenido actualizado', tono: 'neutral' },
  state_changed: { etiqueta: 'Cambio de estado', tono: 'warning' },
  assigned: { etiqueta: 'Asignación', tono: 'info' },
  observation_added: { etiqueta: 'Observación registrada', tono: 'warning' },
};

export function describirTipo(tipo: string): { etiqueta: string; tono: BadgeTone } {
  return (
    (TIPOS_EVENTO as Record<string, { etiqueta: string; tono: BadgeTone } | undefined>)[tipo] ?? {
      etiqueta: tipo,
      tono: 'neutral',
    }
  );
}

/** `tipo`, `desde` y `hasta` viajan al servidor; `texto` filtra lo ya recibido. */
export interface FiltrosTrazabilidad {
  tipo: string;
  desde: string;
  hasta: string;
  texto: string;
}

export const FILTROS_VACIOS: FiltrosTrazabilidad = { tipo: '', desde: '', hasta: '', texto: '' };
