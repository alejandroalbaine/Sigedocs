import { useState } from 'react';
import { Button } from '../../common/components/Button/Button.tsx';
import { Field } from '../../common/components/Field/Field.tsx';
import {
  ACCIONES,
  ESTADOS,
  FILTROS_VACIOS,
  type FiltrosTrazabilidad as Filtros,
} from './catalogos.ts';
import styles from './trazabilidad.module.css';

export interface FiltrosTrazabilidadProps {
  onAplicar: (filtros: Filtros) => void;
}

/** Acción, estado y fechas se aplican al cambiar; los textos, al pulsar Buscar. */
export function FiltrosTrazabilidad({ onAplicar }: FiltrosTrazabilidadProps) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  function cambiar(campo: keyof Filtros, valor: string, aplicar: boolean) {
    const siguientes = { ...filtros, [campo]: valor };
    setFiltros(siguientes);
    if (aplicar) onAplicar(siguientes);
  }

  return (
    <form
      className={styles.filters}
      role="search"
      aria-label="Filtros de trazabilidad"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onAplicar(filtros);
      }}
    >
      <div className={styles.grid}>
        <Field label="Expediente">
          {(control) => (
            <input
              {...control}
              type="text"
              placeholder="Código del expediente"
              value={filtros.expediente}
              onChange={(event) => {
                cambiar('expediente', event.target.value, false);
              }}
            />
          )}
        </Field>
        <Field label="Usuario">
          {(control) => (
            <input
              {...control}
              type="text"
              placeholder="Nombre o correo"
              value={filtros.usuario}
              onChange={(event) => {
                cambiar('usuario', event.target.value, false);
              }}
            />
          )}
        </Field>
        <Field label="Acción">
          {(control) => (
            <select
              {...control}
              value={filtros.accion}
              onChange={(event) => {
                cambiar('accion', event.target.value, true);
              }}
            >
              <option value="">Todas las acciones</option>
              {Object.entries(ACCIONES).map(([valor, { etiqueta }]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Estado nuevo">
          {(control) => (
            <select
              {...control}
              value={filtros.estado}
              onChange={(event) => {
                cambiar('estado', event.target.value, true);
              }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS).map(([valor, { etiqueta }]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Desde">
          {(control) => (
            <input
              {...control}
              type="date"
              value={filtros.desde}
              onChange={(event) => {
                cambiar('desde', event.target.value, true);
              }}
            />
          )}
        </Field>
        <Field label="Hasta">
          {(control) => (
            <input
              {...control}
              type="date"
              value={filtros.hasta}
              onChange={(event) => {
                cambiar('hasta', event.target.value, true);
              }}
            />
          )}
        </Field>
      </div>

      <div className={styles.search}>
        <Field label="Buscar por expediente, usuario, observación o evidencia">
          {(control) => (
            <input
              {...control}
              type="search"
              placeholder="Código, título, observación…"
              value={filtros.texto}
              onChange={(event) => {
                cambiar('texto', event.target.value, false);
              }}
            />
          )}
        </Field>
        <Button type="submit" size="sm">
          Buscar
        </Button>
      </div>

      <div className={styles.foot}>
        <span>Acción, estado y fechas se aplican automáticamente.</span>
        <Button
          variant="text"
          onClick={() => {
            setFiltros(FILTROS_VACIOS);
            onAplicar(FILTROS_VACIOS);
          }}
        >
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}
