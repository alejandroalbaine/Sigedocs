import { Button } from '../../common/components/Button/Button.tsx';
import { Field } from '../../common/components/Field/Field.tsx';
import { localIsoDate } from '../../common/utils/format.ts';
import styles from './observaciones.module.css';

/** Estados que acepta la tabla `observations` del esquema anterior; pendiente del backend. */
const ESTADOS_OBSERVACION = [
  ['pendiente', 'Pendiente'],
  ['en_revision', 'En revisión'],
  ['resuelta', 'Resuelta'],
] as const;

/**
 * Formulario completo pero deshabilitado: `POST /api/v1/expedientes/{id}/observaciones`
 * figura como confirmado en endpoints.md del backend, pero aún no está implementado.
 * El autor y la fecha los determina el servidor a partir de la sesión (campos reservados),
 * por eso aquí solo se muestran.
 */
export function FormularioObservacion({ autor }: { autor: string }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <fieldset className={styles.form} disabled>
        <legend className="visually-hidden">Nueva observación</legend>
        <Field label="Expediente relacionado">
          {(control) => (
            <select {...control} defaultValue="">
              <option value="">Sin expedientes disponibles</option>
            </select>
          )}
        </Field>
        <Field label="Descripción de la observación">
          {(control) => (
            <textarea
              {...control}
              rows={5}
              placeholder="Describa la observación encontrada en el expediente…"
            />
          )}
        </Field>
        <div className={styles.row}>
          <Field label="Estado">
            {(control) => (
              <select {...control} defaultValue="pendiente">
                {ESTADOS_OBSERVACION.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Registrado por" help="Lo asigna el servidor según la sesión.">
            {(control) => <input {...control} type="text" value={autor} readOnly />}
          </Field>
          <Field label="Fecha" help="Lo asigna el servidor al registrar.">
            {(control) => <input {...control} type="date" value={localIsoDate()} readOnly />}
          </Field>
        </div>
        <div className={styles.actions}>
          <Button type="reset" variant="quiet" size="sm">
            Limpiar
          </Button>
          <Button type="submit" size="sm">
            Registrar observación
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
