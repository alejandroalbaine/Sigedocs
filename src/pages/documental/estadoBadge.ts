import { tonoDeEstado } from '../../common/workflow/estados.ts';
import styles from './documental.module.css';

const CLASE_POR_TONO = {
  neutral: '',
  info: styles.badgeInfo,
  warning: styles.badgeWarning,
  success: styles.badgeSuccess,
  final: styles.badgeFinal,
};

/** Clase del badge de estado para las páginas documentales (Gestión, Búsqueda, Revisión). */
export function claseEstado(codigo: string): string {
  return `${styles.badge} ${CLASE_POR_TONO[tonoDeEstado(codigo)] ?? ''}`.trim();
}
