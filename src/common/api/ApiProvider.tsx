import type { ReactNode } from 'react';
import type { ApiClient } from './client.ts';
import { ApiContext } from './ApiContext.ts';

/** Solo hace falta en pruebas: la aplicación usa el cliente real por defecto. */
export function ApiProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return <ApiContext value={client}>{children}</ApiContext>;
}
