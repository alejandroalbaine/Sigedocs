import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Alert } from '../components/Alert/Alert.tsx';
import { Button } from '../components/Button/Button.tsx';
import styles from './RequireSession.module.css';
import { useSession } from './SessionContext.ts';

/** Protege las rutas internas: sin sesión vuelve al acceso recordando la ruta pedida. */
export function RequireSession({ children }: { children?: ReactNode }) {
  const { status, error, refresh } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <p className={styles.status} role="status">
        Verificando sesión…
      </p>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (status === 'error') {
    return (
      <div className={styles.status}>
        <Alert kind="error">{error?.message ?? 'No se pudo verificar la sesión.'}</Alert>
        <Button variant="secondary" size="sm" onClick={() => void refresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return children ?? <Outlet />;
}
