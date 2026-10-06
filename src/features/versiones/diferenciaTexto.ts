/**
 * Diferencia palabra por palabra entre dos textos, para resaltar qué se quitó y qué se agregó
 * en un campo de texto. Se recorta primero lo común al inicio y al final; el tramo restante se
 * alinea con la subsecuencia común más larga. Si ese tramo es demasiado grande, se marca entero
 * como reemplazado en lugar de bloquear la interfaz.
 */

export type TipoFragmento = 'igual' | 'eliminado' | 'agregado';

export interface Fragmento {
  texto: string;
  tipo: TipoFragmento;
}

export interface DiferenciaTexto {
  /** El texto anterior con lo eliminado marcado. */
  antes: Fragmento[];
  /** El texto posterior con lo agregado marcado. */
  despues: Fragmento[];
}

/** Celdas máximas de la tabla de alineación (unas 2000 × 2000 palabras distintas). */
const LIMITE_CELDAS = 4_000_000;

/**
 * Palabras, espacios y signos sueltos («relacional.» son dos tokens): unir los tokens devuelve
 * el texto original.
 */
function tokens(texto: string): string[] {
  return texto.match(/\s+|[\p{L}\p{N}\p{M}_]+|[^\s\p{L}\p{N}\p{M}_]/gu) ?? [];
}

function agregar(destino: Fragmento[], texto: string, tipo: TipoFragmento) {
  if (!texto) return;
  const ultimo = destino.at(-1);
  if (ultimo?.tipo === tipo) ultimo.texto += texto;
  else destino.push({ texto, tipo });
}

export function diferenciaTexto(anterior: string, posterior: string): DiferenciaTexto {
  const a = tokens(anterior);
  const b = tokens(posterior);
  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio] === b[inicio]) inicio++;
  let finA = a.length;
  let finB = b.length;
  while (finA > inicio && finB > inicio && a[finA - 1] === b[finB - 1]) {
    finA--;
    finB--;
  }

  const antes: Fragmento[] = [];
  const despues: Fragmento[] = [];
  const prefijo = a.slice(0, inicio).join('');
  agregar(antes, prefijo, 'igual');
  agregar(despues, prefijo, 'igual');

  const medioA = a.slice(inicio, finA);
  const medioB = b.slice(inicio, finB);
  const n = medioA.length;
  const m = medioB.length;

  if ((n + 1) * (m + 1) > LIMITE_CELDAS) {
    agregar(antes, medioA.join(''), 'eliminado');
    agregar(despues, medioB.join(''), 'agregado');
  } else {
    // largo[i][j]: subsecuencia común más larga entre medioA[i..] y medioB[j..].
    const ancho = m + 1;
    const largo = new Uint32Array((n + 1) * ancho);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        largo[i * ancho + j] =
          medioA[i] === medioB[j]
            ? (largo[(i + 1) * ancho + j + 1] ?? 0) + 1
            : Math.max(largo[(i + 1) * ancho + j] ?? 0, largo[i * ancho + j + 1] ?? 0);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      const tokenA = medioA[i] ?? '';
      const tokenB = medioB[j] ?? '';
      if (tokenA === tokenB) {
        agregar(antes, tokenA, 'igual');
        agregar(despues, tokenB, 'igual');
        i++;
        j++;
      } else if ((largo[(i + 1) * ancho + j] ?? 0) >= (largo[i * ancho + j + 1] ?? 0)) {
        agregar(antes, tokenA, 'eliminado');
        i++;
      } else {
        agregar(despues, tokenB, 'agregado');
        j++;
      }
    }
    for (; i < n; i++) agregar(antes, medioA[i] ?? '', 'eliminado');
    for (; j < m; j++) agregar(despues, medioB[j] ?? '', 'agregado');
  }

  const sufijo = a.slice(finA).join('');
  agregar(antes, sufijo, 'igual');
  agregar(despues, sufijo, 'igual');
  return { antes, despues };
}
