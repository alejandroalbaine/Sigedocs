import type { SortState } from '../../common/components/DataTable/DataTable.tsx';
import type { EventoTrazabilidad, FiltrosTrazabilidad } from './catalogos.ts';

function contiene(valor: string | null, busqueda: string): boolean {
  return (valor ?? '').toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'));
}

/** Filtros de la interfaz. Las fechas comparan solo el día (AAAA-MM-DD). */
export function filtrarEventos(
  eventos: readonly EventoTrazabilidad[],
  filtros: FiltrosTrazabilidad,
): EventoTrazabilidad[] {
  return eventos.filter((evento) => {
    const dia = evento.fecha.slice(0, 10);
    return (
      contiene(evento.expedienteCodigo, filtros.expediente) &&
      contiene(evento.usuarioNombre, filtros.usuario) &&
      (!filtros.desde || dia >= filtros.desde) &&
      (!filtros.hasta || dia <= filtros.hasta) &&
      [evento.expedienteCodigo, evento.expedienteTitulo, evento.usuarioNombre, evento.observacion]
        .filter((campo): campo is string => typeof campo === 'string')
        .some((campo) => contiene(campo, filtros.texto))
    );
  });
}

const ORDENABLES = ['fecha', 'accion', 'expedienteCodigo', 'usuarioNombre', 'version'] as const;
type Ordenable = (typeof ORDENABLES)[number];

function esOrdenable(clave: string): clave is Ordenable {
  return (ORDENABLES as readonly string[]).includes(clave);
}

export function ordenarEventos(
  eventos: readonly EventoTrazabilidad[],
  orden: SortState,
): EventoTrazabilidad[] {
  const { key } = orden;
  if (!esOrdenable(key)) return [...eventos];
  const signo = orden.direction === 'asc' ? 1 : -1;
  return [...eventos].sort((a, b) => signo * a[key].localeCompare(b[key], 'es'));
}
