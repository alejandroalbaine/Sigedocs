import { Alert, Button, Card, EmptyState } from '../../common/components/index.ts';
import { formatDateTime } from '../../common/utils/format.ts';
import type { Observacion } from './types.ts';
import styles from './observaciones.module.css';

export interface ListaObservacionesProps {
  observaciones: readonly Observacion[];
  cargando: boolean;
  error: string;
  recargar: () => void;
  /** Código del expediente, para encabezar cada observación. */
  expedienteCodigo: string;
}

/**
 * Las observaciones son inmutables: el backend no expone estado ni edición, así que
 * la lista solo muestra quién las registró, cuándo y sobre qué sección.
 */
export function ListaObservaciones({
  observaciones,
  cargando,
  error,
  recargar,
  expedienteCodigo,
}: ListaObservacionesProps) {
  return (
    <Card
      title="Observaciones registradas"
      description="Inmutables: una vez registradas no se editan ni se eliminan."
    >
      {cargando && <p className={styles.aviso}>Cargando observaciones…</p>}

      {!cargando && error && (
        <div className={styles.errorBloque}>
          <Alert kind="error">{error}</Alert>
          <Button variant="secondary" onClick={recargar}>
            Reintentar
          </Button>
        </div>
      )}

      {!cargando && !error && observaciones.length === 0 && (
        <EmptyState title="Sin observaciones">
          Todavía no hay observaciones registradas para este expediente.
        </EmptyState>
      )}

      {!cargando && !error && observaciones.length > 0 && (
        <ul className={styles.lista}>
          {observaciones.map((observacion) => (
            <li key={observacion.id} className={styles.item}>
              <div className={styles.itemEncabezado}>
                <span className={styles.itemVersion}>{observacion.version.label}</span>
                <span className={styles.itemMeta}>
                  {observacion.autor} · {formatDateTime(observacion.fecha)}
                </span>
              </div>
              <p className={styles.itemTexto}>{observacion.descripcion}</p>
              <p className={styles.itemUbicacion}>
                {expedienteCodigo}
                {observacion.seccion ? ` · Sección ${observacion.seccion}` : ''}
                {observacion.campo ? ` · Campo ${observacion.campo}` : ''}
                {observacion.itemId ? ` · Ítem ${observacion.itemId}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
