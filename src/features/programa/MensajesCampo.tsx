import type { Hallazgo } from './validacion.ts';
import styles from './programa.module.css';

export function MensajesCampo({
  id,
  hallazgos,
  ruta,
}: {
  id: string;
  hallazgos: readonly Hallazgo[];
  ruta: string;
}) {
  const propios = hallazgos.filter((item) => item.ruta === ruta);
  if (!propios.length) return null;
  return (
    <div id={id} className={styles.mensajesCampo}>
      {propios.map((item) => (
        <small
          key={`${item.severidad}:${item.mensaje}`}
          className={item.severidad === 'error' ? styles.error : styles.aviso}
        >
          {item.mensaje}
        </small>
      ))}
    </div>
  );
}
