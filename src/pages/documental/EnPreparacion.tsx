import { Alert } from '../../common/components/index.ts';

interface EnPreparacionProps {
  /** Qué parte del sistema falta, en lenguaje del usuario. */
  modulo?: string;
}

/**
 * Aviso neutro para una función que el servidor todavía no publica (respuesta 404).
 * No es un error del usuario ni de la aplicación, así que no se muestra en rojo.
 */
export function EnPreparacion({ modulo = 'El módulo de expedientes' }: EnPreparacionProps) {
  return (
    <Alert kind="info">
      {modulo} está en preparación. La información aparecerá aquí en cuanto esté disponible.
    </Alert>
  );
}
