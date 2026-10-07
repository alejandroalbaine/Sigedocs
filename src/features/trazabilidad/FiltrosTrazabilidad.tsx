import { useState } from 'react';
import type { Dossier } from '../../common/api/dossierContract.ts';
import { Button } from '../../common/components/Button/Button.tsx';
import { Field } from '../../common/components/Field/Field.tsx';
import { FILTROS_VACIOS, TIPOS_EVENTO, type FiltrosTrazabilidad as Filtros } from './catalogos.ts';
import styles from './trazabilidad.module.css';

export interface FiltrosTrazabilidadProps {
  expedientes: readonly Dossier[];
  expediente: string;
  onExpediente: (dossierId: string) => void;
  onAplicar: (filtros: Filtros) => void;
}

/** Expediente, evento y fechas se aplican al cambiar; el texto, al pulsar Buscar. */
export function FiltrosTrazabilidad({
  expedientes,
  expediente,
  onExpediente,
  onAplicar,
}: FiltrosTrazabilidadProps) {
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
            <select
              {...control}
              value={expediente}
              onChange={(event) => {
                onExpediente(event.target.value);
              }}
            >
              {expedientes.length > 0 && <option value="">Seleccione un expediente</option>}
              {expedientes.map((item) => (
                <option key={item.dossierId} value={item.dossierId}>
                  {item.code} · {item.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Evento">
          {(control) => (
            <select
              {...control}
              value={filtros.tipo}
              onChange={(event) => {
                cambiar('tipo', event.target.value, true);
              }}
            >
              <option value="">Todos los eventos</option>
              {Object.entries(TIPOS_EVENTO).map(([valor, { etiqueta }]) => (
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
              max={filtros.hasta || undefined}
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
              min={filtros.desde || undefined}
              onChange={(event) => {
                cambiar('hasta', event.target.value, true);
              }}
            />
          )}
        </Field>
      </div>

      <div className={styles.search}>
        <Field label="Buscar en resumen, usuario o versión">
          {(control) => (
            <input
              {...control}
              type="search"
              value={filtros.texto}
              placeholder="Texto del evento…"
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
        <span>Expediente, evento y fechas se consultan al servidor al cambiar.</span>
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
