import { useState } from 'react';
import type { Dossier } from './types.ts';

export const LEVEL_OPTIONS = [
  { value: 'associate', label: 'Técnico superior' },
  { value: 'bachelor', label: 'Grado' },
] as const;

type Named = { code: string; name: string };

/**
 * Estados vistos en las páginas cargadas. Con el filtro aplicado en el servidor la página
 * actual solo trae un estado, así que se acumulan para no perder las demás opciones.
 */
export function useSeenStates(items: readonly Dossier[], selected: string): Named[] {
  const [seen, setSeen] = useState<Map<string, Named>>(() => new Map());
  const missing = items.filter((item) => !seen.has(item.currentState.code));
  if (missing.length > 0) {
    setSeen((current) => {
      const next = new Map(current);
      for (const item of missing) next.set(item.currentState.code, item.currentState);
      return next;
    });
  }
  const options = [...seen.values()];
  if (selected && !seen.has(selected)) options.push({ code: selected, name: selected });
  return options;
}
