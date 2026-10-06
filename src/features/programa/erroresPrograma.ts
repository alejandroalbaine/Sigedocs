import type { FieldError } from '../../common/api/contract.ts';
import type { TemplateField, TemplateVersion } from '../../common/api/templateContract.ts';
import type { Contenido, Item, Valor } from './contenido.ts';
import type { Hallazgo } from './validacion.ts';

export const idCampo = (ruta: string) => `campo-${encodeURIComponent(ruta)}`;
export const idSeccion = (ruta: string) => `seccion-${encodeURIComponent(ruta)}`;
export const pertenece = (ruta: string, base: string) =>
  ruta === base || ruta.startsWith(`${base}.`) || ruta.startsWith(`${base}[`);

const mensajes: Record<string, string> = {
  REQUIRED: 'Complete este campo obligatorio.',
  CARDINALITY_MIN: 'Agregue los elementos obligatorios de este grupo.',
  CARDINALITY_MAX: 'Quite elementos: este grupo supera el máximo permitido.',
  INVALID_TYPE: 'Revise el tipo de dato de este campo.',
  INVALID_OPTION: 'Seleccione una opción válida.',
  SUM_EQUALS: 'Revise la suma de los porcentajes del plan de evaluación.',
};

export function hallazgosServidor(errores: readonly FieldError[]): Hallazgo[] {
  return errores.map((error) => ({
    ruta: error.field.replace(/^content\./, ''),
    mensaje:
      error.message?.trim() ||
      mensajes[error.code] ||
      'Revise este campo: no cumple las reglas de la plantilla.',
    severidad: 'error',
  }));
}

interface Destino {
  ruta: string;
  id: string;
  etiqueta: string;
}

/** Resuelve también errores de un elemento/grupo o una sección completos. */
export function destinosPrograma(plantilla: TemplateVersion, contenido: Contenido): Destino[] {
  const destinos: Destino[] = [];
  function campos(
    lista: readonly TemplateField[],
    datos: Record<string, Valor>,
    base: string,
    etiqueta: string,
  ) {
    for (const campo of lista) {
      const ruta = `${base}.${campo.key}`;
      const nombre = `${etiqueta} · ${campo.label}`;
      destinos.push({ ruta, id: idCampo(ruta), etiqueta: nombre });
      const valor = datos[campo.key];
      if (campo.type === 'repeatable_group' && Array.isArray(valor)) {
        (valor as Item[]).forEach((item, indice) => {
          const rutaItem = `${ruta}[${item.itemId}]`;
          const nombreItem = `${nombre} ${String(indice + 1)}`;
          destinos.push({ ruta: rutaItem, id: idCampo(rutaItem), etiqueta: nombreItem });
          campos(campo.config?.fields ?? [], item, rutaItem, nombreItem);
        });
      }
    }
  }
  for (const seccion of plantilla.sections.filter((item) => item.isActive)) {
    destinos.push({ ruta: seccion.key, id: idSeccion(seccion.key), etiqueta: seccion.title });
    campos(seccion.fields, contenido[seccion.key] ?? {}, seccion.key, seccion.title);
  }
  return destinos;
}

/** Evita errores invisibles: las rutas desconocidas se ubican en su ancestro conocido. */
export function ubicarHallazgos(
  hallazgos: readonly Hallazgo[],
  destinos: readonly Destino[],
): Hallazgo[] {
  const unicos = new Map<string, Hallazgo>();
  for (const hallazgo of hallazgos) {
    const destino = destinos
      .filter((item) => pertenece(hallazgo.ruta, item.ruta))
      .sort((a, b) => b.ruta.length - a.ruta.length)[0];
    const ubicado = { ...hallazgo, ruta: destino?.ruta ?? hallazgo.ruta };
    unicos.set(`${ubicado.ruta}:${ubicado.severidad}:${ubicado.mensaje}`, ubicado);
  }
  return [...unicos.values()];
}

export function irAlError(id: string) {
  const destino = document.getElementById(id);
  if (!destino) return;
  for (let padre: HTMLElement | null = destino; padre; padre = padre.parentElement) {
    if (padre instanceof HTMLDetailsElement) padre.open = true;
  }
  destino.focus();
  destino.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}
