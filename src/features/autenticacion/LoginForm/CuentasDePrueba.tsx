import styles from './LoginForm.module.css';

/**
 * Cuentas que siembra SIGESDOC_BACKEND con database/scripts/usuarios-prueba.mjs, una por
 * rol institucional (migración 004). Solo se muestran en desarrollo y nunca incluyen la
 * contraseña: es el valor de SEED_PASSWORD del backend.
 */
const CUENTAS = [
  ['admin.sistema@uapa.edu.do', 'Admin del Sistema'],
  ['dir.curricular@uapa.edu.do', 'Dir. Gestión Curricular'],
  ['especialista.curricular@uapa.edu.do', 'Especialista Curricular'],
  ['coord.programa@uapa.edu.do', 'Coordinador de Programa'],
  ['facilitador@uapa.edu.do', 'Facilitador de Contenido'],
  ['dir.escuela@uapa.edu.do', 'Director de Escuela'],
  ['vpid@uapa.edu.do', 'VPID'],
  ['vra@uapa.edu.do', 'VRA (solo consulta)'],
  ['sin.permisos@uapa.edu.do', 'Sin roles'],
  ['inactivo@uapa.edu.do', 'Cuenta inactiva'],
] as const;

export function CuentasDePrueba({ onSelect }: { onSelect: (email: string) => void }) {
  return (
    <details className={styles.dev}>
      <summary>Cuentas de prueba (solo desarrollo)</summary>
      <p>La contraseña es el valor de SEED_PASSWORD con que se sembró el backend.</p>
      <ul className={styles.accounts}>
        {CUENTAS.map(([email, nombre]) => (
          <li key={email}>
            <button
              type="button"
              className={styles.account}
              onClick={() => {
                onSelect(email);
              }}
            >
              {nombre}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
