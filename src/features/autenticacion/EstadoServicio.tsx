import { useEffect, useState } from 'react';
import { useApi } from '../../common/api/ApiContext.ts';
import { Badge, type BadgeTone } from '../../common/components/Badge/Badge.tsx';

type Estado = 'verificando' | 'disponible' | 'no-disponible';

const PRESENTACION: Record<Estado, { tone: BadgeTone; texto: string }> = {
  verificando: { tone: 'neutral', texto: 'Verificando servicio…' },
  disponible: { tone: 'success', texto: 'Servicio disponible' },
  'no-disponible': { tone: 'danger', texto: 'Servicio no disponible' },
};

/** Consulta `GET /api/v1/status` una vez. 503 o fallo de red se muestran como no disponible. */
export function EstadoServicio() {
  const client = useApi();
  const [estado, setEstado] = useState<Estado>('verificando');

  useEffect(() => {
    let active = true;
    client
      .request('status')
      .then(({ status }) => {
        if (active) setEstado(status === 'available' ? 'disponible' : 'no-disponible');
      })
      .catch(() => {
        if (active) setEstado('no-disponible');
      });
    return () => {
      active = false;
    };
  }, [client]);

  const { tone, texto } = PRESENTACION[estado];
  return (
    <span role="status">
      <Badge tone={tone}>{texto}</Badge>
    </span>
  );
}
