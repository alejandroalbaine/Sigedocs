import { useState } from 'react';
import { Button } from '../../common/components/Button/Button.tsx';
import { Field } from '../../common/components/Field/Field.tsx';
import { FILTROS_VACIOS, TIPOS_AUDITORIA, type FiltrosTrazabilidad as Filtros } from './catalogos.ts';
import styles from './trazabilidad.module.css';

export interface FiltrosTrazabilidadProps {
  onAplicar: (filtros: Filtros) => void;
}

/**
 * El tipo de evento y las fechas viajan al backend (`type`, `from`, `to`); expediente,
 * usuario y el texto libre se resuelven en la interfaz sobre los eventos ya servidos.
 * No hay filtro por estado porque el contrato B7 no publica los estados de la transición.
 */
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
              placeholder="Código o título del expediente"
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
              placeholder="Nombre de quien registró la acción"
              value={filtros.usuario}
              onChange={(event) => {
                cambiar('usuario', event.target.value, false);
              }}
            />
          )}
        </Field>
        <Field label="Tipo de evento" help="Filtra por el `type` del contrato de auditoría (B7).">
          {(control) => (
            <select
              {...control}
              value={filtros.tipoEvento}
              onChange={(event) => {
                cambiar('tipoEvento', event.target.value, true);
              }}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(TIPOS_AUDITORIA).map(([valor, { etiqueta }]) => (
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
        <Field label="Buscar por expediente, usuario o detalle">
          {(control) => (
            <input
              {...control}
              type="search"
              placeholder="Código, título, detalle…"
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
        <span>El tipo de evento y las fechas se aplican automáticamente.</span>
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
