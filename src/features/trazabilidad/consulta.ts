import type { AuditEvent } from '../../common/api/dossierContract.ts';
import type { SortState } from '../../common/components/DataTable/DataTable.tsx';
import type { FiltrosTrazabilidad } from './catalogos.ts';

/** Parámetros de `audit-events` según el contrato: `type`, `from`, `to`. */
export function consultaServidor(filtros: FiltrosTrazabilidad): Record<string, string> {
  return { type: filtros.tipo, from: filtros.desde, to: filtros.hasta };
}

function contiene(valor: string | null, busqueda: string): boolean {
  return (valor ?? '').toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'));
}

export function filtrarPorTexto(eventos: readonly AuditEvent[], texto: string): AuditEvent[] {
  if (!texto.trim()) return [...eventos];
  return eventos.filter((evento) =>
    [evento.summary, evento.user.name, evento.versionLabel].some((campo) => contiene(campo, texto)),
  );
}

const ORDENABLES = {
  fecha: (e: AuditEvent) => e.occurredAt,
  tipo: (e: AuditEvent) => e.type,
  usuario: (e: AuditEvent) => e.user.name,
  version: (e: AuditEvent) => e.versionLabel ?? '',
} as const;

export function ordenarEventos(eventos: readonly AuditEvent[], orden: SortState): AuditEvent[] {
  const valor = ORDENABLES[orden.key as keyof typeof ORDENABLES] as
    ((e: AuditEvent) => string) | undefined;
  if (!valor) return [...eventos];
  const signo = orden.direction === 'asc' ? 1 : -1;
  return [...eventos].sort((a, b) => signo * valor(a).localeCompare(valor(b), 'es'));
}
