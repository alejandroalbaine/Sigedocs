/**
 * Datos del comparador: las dos versiones del expediente (`GET /dossiers/{id}/versions/{id}`)
 * y la plantilla de cada una (`GET /templates/{templateId}/versions/{templateVersionId}`). Se
 * compara en el cliente: el backend no publica una ruta de comparación.
 */
import { dossiersApi, templatesApi } from '../../common/api/dossiers.ts';
import type {
  Dossier,
  DossierVersion,
  DossierVersionDetail,
} from '../../common/api/dossierContract.ts';
import type { TemplateVersion } from '../../common/api/templateContract.ts';
import { compararContenido, type Comparacion } from './comparacion.ts';

export interface DatosComparacion {
  base: DossierVersionDetail;
  comparada: DossierVersionDetail;
  comparacion: Comparacion;
  /** Las versiones usan versiones distintas de la plantilla (actualización curricular). */
  plantillaDistinta: boolean;
}

/** `v1.2` → [1, 2]; una etiqueta con otra forma no se puede ordenar por número. */
function numeros(label: string): [number, number] | null {
  const partes = /^v(\d+)\.(\d+)$/i.exec(label.trim());
  return partes ? [Number(partes[1]), Number(partes[2])] : null;
}

/** De la más antigua a la más reciente, por número de versión y, si no se puede, por fecha. */
export function ordenarVersiones(versiones: readonly DossierVersion[]): DossierVersion[] {
  return [...versiones].sort((a, b) => {
    const na = numeros(a.label);
    const nb = numeros(b.label);
    if (na && nb && (na[0] !== nb[0] || na[1] !== nb[1])) {
      return na[0] !== nb[0] ? na[0] - nb[0] : na[1] - nb[1];
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/**
 * Par inicial: la versión vigente contra la inmediatamente anterior, que es la que revisó la
 * especialista antes de devolver el programa. `null` si el expediente tiene una sola versión.
 */
export function parInicial(
  ordenadas: readonly DossierVersion[],
  vigente: string,
): { base: string; comparada: string } | null {
  if (ordenadas.length < 2) return null;
  const indice = ordenadas.findIndex((version) => version.versionId === vigente);
  const posterior = indice > 0 ? indice : ordenadas.length - 1;
  const base = ordenadas[posterior - 1];
  const comparada = ordenadas[posterior];
  return base && comparada ? { base: base.versionId, comparada: comparada.versionId } : null;
}

export async function cargarComparacion(
  dossier: Pick<Dossier, 'dossierId' | 'template'>,
  baseId: string,
  comparadaId: string,
): Promise<{ data: DatosComparacion }> {
  const [{ data: base }, { data: comparada }] = await Promise.all([
    dossiersApi.version(dossier.dossierId, baseId),
    dossiersApi.version(dossier.dossierId, comparadaId),
  ]);
  const ids = [...new Set([base.templateVersionId, comparada.templateVersionId])];
  const plantillas = new Map<string, TemplateVersion>(
    await Promise.all(
      ids.map(
        async (id) =>
          [id, (await templatesApi.version(dossier.template.templateId, id)).data] as const,
      ),
    ),
  );
  const plantillaBase = plantillas.get(base.templateVersionId);
  const plantillaComparada = plantillas.get(comparada.templateVersionId);
  if (!plantillaBase || !plantillaComparada) throw new Error('Falta la plantilla de una versión.');
  return {
    data: {
      base,
      comparada,
      comparacion: compararContenido(
        { plantilla: plantillaBase, contenido: base.content },
        { plantilla: plantillaComparada, contenido: comparada.content },
      ),
      plantillaDistinta: ids.length > 1,
    },
  };
}
