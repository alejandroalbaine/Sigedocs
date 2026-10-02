import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { TemplateField } from '../../common/api/templateContract.ts';
import { CampoPlantilla, type Catalogos } from './CampoPlantilla.tsx';
import { nuevoItem, type Item, type Valor } from './contenido.ts';
import type { Hallazgo } from './validacion.ts';
import styles from './programa.module.css';

interface GrupoProps {
  campo: TemplateField;
  items: readonly Item[];
  ruta: string;
  editable: boolean;
  hallazgos: readonly Hallazgo[];
  catalogos: Catalogos;
  onChange: (items: Item[]) => void;
}

function limite(campo: TemplateField, clave: 'minItems' | 'maxItems'): number | undefined {
  const regla = campo.rules?.find((item) => item.type === 'cardinality' && item.isActive);
  const valor = regla?.params[clave];
  return typeof valor === 'number' ? valor : undefined;
}

/**
 * `repeatable_group` (§5): lista de elementos con `itemId`. Agregar, quitar y reordenar se
 * habilitan según `config` y la regla `cardinality`; admite un subgrupo (2 niveles).
 */
export function GrupoRepetible({
  campo,
  items,
  ruta,
  editable,
  hallazgos,
  catalogos,
  onChange,
}: GrupoProps) {
  const campos = [...(campo.config?.fields ?? [])].sort((a, b) => a.position - b.position);
  const min = limite(campo, 'minItems') ?? 0;
  const max = limite(campo, 'maxItems');
  const puedeAgregar =
    editable && campo.config?.addable !== false && (max === undefined || items.length < max);
  const puedeQuitar = editable && campo.config?.removable !== false && items.length > min;
  const ordenable = editable && campo.config?.sortable === true;
  const propios = hallazgos.filter((hallazgo) => hallazgo.ruta === ruta);

  function actualizar(indice: number, clave: string, valor: Valor) {
    onChange(items.map((item, i) => (i === indice ? { ...item, [clave]: valor } : item)));
  }

  function mover(indice: number, delta: number) {
    const siguiente = [...items];
    const [item] = siguiente.splice(indice, 1);
    if (item) siguiente.splice(indice + delta, 0, item);
    onChange(siguiente);
  }

  return (
    <section className={styles.grupo} aria-label={campo.label}>
      <header className={styles.grupoCabecera}>
        <span className={styles.etiqueta}>
          {campo.label}
          {campo.isRequired ? ' *' : ''}
        </span>
        <small className={styles.ayuda}>
          {items.length} elemento(s)
          {min || max !== undefined
            ? ` · ${min ? `mínimo ${String(min)}` : ''}${min && max !== undefined ? ', ' : ''}${max !== undefined ? `máximo ${String(max)}` : ''}`
            : ''}
        </small>
      </header>
      {campo.help && <small className={styles.ayuda}>{campo.help}</small>}
      {propios.map((hallazgo) => (
        <small
          key={hallazgo.mensaje}
          className={hallazgo.severidad === 'error' ? styles.error : styles.aviso}
        >
          {hallazgo.mensaje}
        </small>
      ))}

      <ol className={campo.config?.presentation === 'table' ? styles.itemsTabla : styles.items}>
        {items.map((item, indice) => (
          <li key={item.itemId} className={styles.item}>
            <div className={styles.itemCabecera}>
              <strong>
                {campo.label} {indice + 1}
              </strong>
              {editable && (
                <span className={styles.itemAcciones}>
                  {ordenable && (
                    <>
                      <button
                        type="button"
                        aria-label={`Subir elemento ${String(indice + 1)}`}
                        disabled={indice === 0}
                        onClick={() => {
                          mover(indice, -1);
                        }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar elemento ${String(indice + 1)}`}
                        disabled={indice === items.length - 1}
                        onClick={() => {
                          mover(indice, 1);
                        }}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </>
                  )}
                  {puedeQuitar && (
                    <button
                      type="button"
                      aria-label={`Quitar elemento ${String(indice + 1)}`}
                      onClick={() => {
                        onChange(items.filter((_, i) => i !== indice));
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </span>
              )}
            </div>
            <div className={styles.itemCampos}>
              {campos.map((sub) => {
                const subruta = `${ruta}[${item.itemId}].${sub.key}`;
                return sub.type === 'repeatable_group' ? (
                  <GrupoRepetible
                    key={sub.key}
                    campo={sub}
                    items={(item[sub.key] as Item[] | undefined) ?? []}
                    ruta={subruta}
                    editable={editable}
                    hallazgos={hallazgos}
                    catalogos={catalogos}
                    onChange={(valor) => {
                      actualizar(indice, sub.key, valor);
                    }}
                  />
                ) : (
                  <CampoPlantilla
                    key={sub.key}
                    campo={sub}
                    valor={item[sub.key]}
                    ruta={subruta}
                    editable={editable}
                    hallazgos={hallazgos}
                    catalogos={catalogos}
                    onChange={(valor) => {
                      actualizar(indice, sub.key, valor);
                    }}
                  />
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {items.length === 0 && <p className={styles.vacio}>Sin elementos.</p>}
      {puedeAgregar && (
        <button
          type="button"
          className={styles.agregar}
          onClick={() => {
            onChange([...items, nuevoItem(campos)]);
          }}
        >
          <Plus size={16} /> Agregar {campo.label.toLocaleLowerCase('es')}
        </button>
      )}
    </section>
  );
}
