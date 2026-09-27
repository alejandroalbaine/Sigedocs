import type { AlertKind } from '../../common/components/Alert/Alert.tsx';

export const REQUISITOS = [
  'Documentación completa',
  'Datos del solicitante correctos',
  'Documentos legibles y vigentes',
  'Requisitos del trámite cumplidos',
  'Anexos y documentos verificados',
] as const;

export type AccionRevision = 'borrador' | 'correccion' | 'rechazo' | 'aprobacion';

/**
 * Mismas reglas que legacy/revision.js. Ninguna acción se envía: el backend aún no publica
 * `POST /api/v1/dossiers/{dossierId}/transitions` cuando backend implemente esa ruta confirmada.
 */
export function validarAccion(
  accion: AccionRevision,
  observaciones: string,
  checklistCompleto: boolean,
): { kind: AlertKind; texto: string } {
  if ((accion === 'correccion' || accion === 'rechazo') && !observaciones.trim()) {
    return { kind: 'error', texto: 'Escriba las observaciones antes de preparar esta decisión.' };
  }
  if (accion === 'aprobacion' && !checklistCompleto) {
    return {
      kind: 'error',
      texto: 'Complete todos los requisitos antes de preparar la aprobación.',
    };
  }
  return {
    kind: 'info',
    texto:
      'La revisión no se envió. El backend todavía debe publicar el contrato para guardar esta operación.',
  };
}
