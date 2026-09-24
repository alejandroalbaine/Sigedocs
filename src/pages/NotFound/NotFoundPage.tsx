import { Link } from 'react-router';
import { EmptyState } from '../../common/components/EmptyState/EmptyState.tsx';

export function NotFoundPage() {
  return (
    <>
      <title>Página no encontrada | SIGESDOC</title>
      <EmptyState title="Página no encontrada">
        La dirección no corresponde a ningún módulo. <Link to="/">Volver al panel principal</Link>.
      </EmptyState>
    </>
  );
}
