import { useEffect, useState } from 'react';
import { domainRequest } from '../../common/api/domainClient.ts';
import { errorMessage } from '../../common/api/errors.ts';
import type { Dossier } from './types.ts';

export function useDossiers(query = '') {
  const [items, setItems] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    domainRequest<Dossier[]>(`/dossiers?limit=25${query}`)
      .then(({ data }) => {
        if (active) setItems(data);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason, 'No fue posible consultar los expedientes.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);
  return { items, loading, error };
}
