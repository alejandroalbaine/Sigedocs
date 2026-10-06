import { useId } from 'react';
import { mismoRol, type OpcionRol } from './reglas.ts';
import styles from './usuarios.module.css';

export interface SeleccionRolesProps {
  opciones: readonly OpcionRol[];
  seleccion: readonly string[];
  onCambiar: (codigos: string[]) => void;
  error?: string | undefined;
}

/** Casillas de rol; la selección se compara por código del contrato o por su alias. */
export function SeleccionRoles({ opciones, seleccion, onCambiar, error }: SeleccionRolesProps) {
  const errorId = useId();
  const marcado = (codigo: string) => seleccion.some((actual) => mismoRol(actual, codigo));

  return (
    <fieldset
      className={styles.roleList}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend>Roles</legend>
      {opciones.map((opcion) => (
        <label key={opcion.code} className={styles.roleOption}>
          <input
            type="checkbox"
            checked={marcado(opcion.code)}
            onChange={(event) => {
              const sinEste = seleccion.filter((actual) => !mismoRol(actual, opcion.code));
              onCambiar(event.target.checked ? [...sinEste, opcion.code] : sinEste);
            }}
          />
          {opcion.name}
        </label>
      ))}
      {error && (
        <small id={errorId} className={styles.fieldError}>
          {error}
        </small>
      )}
    </fieldset>
  );
}
