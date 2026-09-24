import type { ReactNode } from 'react';
import styles from './Alert.module.css';

export type AlertKind = 'error' | 'success' | 'info' | 'warning';

export interface AlertProps {
  kind?: AlertKind;
  children: ReactNode;
}

/** Los errores se anuncian de inmediato; el resto, cuando el lector de pantalla termine. */
export function Alert({ kind = 'info', children }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[kind]}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
