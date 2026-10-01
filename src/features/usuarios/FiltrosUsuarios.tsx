import { useState } from 'react';
import { Button, Field, TextField } from '../../common/components/index.ts';
import {
  FILTROS_VACIOS,
  type EstadoFiltro,
  type FiltrosUsuarios as Filtros,
  type OpcionRol,
} from './reglas.ts';
import styles from './usuarios.module.css';

export interface FiltrosUsuariosProps {
  roles: readonly OpcionRol[];
  valor: Filtros;
  onAplicar: (filtros: Filtros) => void;
}

/** Rol y estado se aplican al cambiar; el texto, al pulsar Buscar. */
export function FiltrosUsuarios({ roles, valor, onAplicar }: FiltrosUsuariosProps) {
  const [texto, setTexto] = useState(valor.texto);

  return (
    <form
      className={styles.filters}
      role="search"
      aria-label="Filtros de usuarios"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar({ ...valor, texto });
      }}
    >
      <div className={styles.grid}>
        <div className={styles.search}>
          <TextField
            label="Buscar"
            placeholder="Nombre o correo"
            value={texto}
            onChange={(event) => {
              setTexto(event.target.value);
            }}
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </div>
        <Field label="Rol">
          {(control) => (
            <select
              {...control}
              value={valor.rol}
              onChange={(event) => {
                onAplicar({ ...valor, texto, rol: event.target.value });
              }}
            >
              <option value="">Todos los roles</option>
              {roles.map((rol) => (
                <option key={rol.code} value={rol.code}>
                  {rol.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Estado">
          {(control) => (
            <select
              {...control}
              value={valor.estado}
              onChange={(event) => {
                onAplicar({ ...valor, texto, estado: event.target.value as EstadoFiltro });
              }}
            >
              <option value="">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          )}
        </Field>
        <div>
          <Button
            variant="quiet"
            onClick={() => {
              setTexto('');
              onAplicar(FILTROS_VACIOS);
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
    </form>
  );
}
