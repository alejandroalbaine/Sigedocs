import type { CatalogOption } from '../../common/api/dossierContract.ts';
import type { TemplateField, TemplateOption } from '../../common/api/templateContract.ts';
import { esCatalogo, mostrarValor, type Valor } from './contenido.ts';
import type { Hallazgo } from './validacion.ts';
import styles from './programa.module.css';

export type Catalogos = Record<string, CatalogOption[] | 'pendiente' | 'cargando'>;

interface CampoProps {
  campo: TemplateField;
  valor: Valor;
  ruta: string;
  editable: boolean;
  hallazgos: readonly Hallazgo[];
  catalogos: Catalogos;
  onChange: (valor: Valor) => void;
}

function opcionesDe(campo: TemplateField, catalogos: Catalogos): TemplateOption[] | null {
  if (!campo.optionsSource) return campo.options ?? [];
  const lista = catalogos[campo.optionsSource.catalog];
  return Array.isArray(lista) ? lista : null;
}

const claveDe = (valor: Valor) =>
  typeof valor === 'object' && valor !== null && 'value' in valor
    ? (valor as TemplateOption).value
    : typeof valor === 'string' || typeof valor === 'number'
      ? String(valor)
      : '';

/** Un campo de la plantilla (template-data-contract.md §4), salvo `repeatable_group`. */
export function CampoPlantilla({
  campo,
  valor,
  ruta,
  editable,
  hallazgos,
  catalogos,
  onChange,
}: CampoProps) {
  const id = `campo-${ruta.replace(/[^\w-]/g, '_')}`;
  const propios = hallazgos.filter((hallazgo) => hallazgo.ruta === ruta);
  const errorId = propios.length ? `${id}-error` : undefined;
  const ayudaId = campo.help ? `${id}-ayuda` : undefined;
  const describedBy = [ayudaId, errorId].filter(Boolean).join(' ') || undefined;
  const bloqueado = !editable || campo.isReadOnly === true;
  const invalido = propios.some((hallazgo) => hallazgo.severidad === 'error') || undefined;
  const etiqueta = `${campo.label}${campo.isRequired ? ' *' : ''}`;

  if (bloqueado) {
    return (
      <div className={styles.campo}>
        <span className={styles.etiqueta}>{etiqueta}</span>
        <span className={styles.lectura}>{mostrarValor(campo, valor)}</span>
      </div>
    );
  }

  const opciones = opcionesDe(campo, catalogos);
  let control;
  switch (campo.type) {
    case 'long_text':
      control = (
        <textarea
          id={id}
          className={styles.control}
          rows={4}
          value={typeof valor === 'string' ? valor : ''}
          aria-invalid={invalido}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      );
      break;
    case 'number':
      control = (
        <input
          id={id}
          className={styles.control}
          type="number"
          inputMode="decimal"
          step={campo.config?.decimals ? 1 / 10 ** campo.config.decimals : 1}
          value={typeof valor === 'number' ? valor : ''}
          aria-invalid={invalido}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value === '' ? null : Number(event.target.value));
          }}
        />
      );
      break;
    case 'date':
      control = (
        <input
          id={id}
          className={styles.control}
          type="date"
          value={typeof valor === 'string' ? valor : ''}
          aria-invalid={invalido}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      );
      break;
    case 'boolean':
      control = (
        <label className={styles.check}>
          <input
            id={id}
            type="checkbox"
            checked={valor === true}
            aria-describedby={describedBy}
            onChange={(event) => {
              onChange(event.target.checked);
            }}
          />
          Sí
        </label>
      );
      break;
    case 'select':
    case 'multi_select':
      if (opciones === null) {
        control = (
          <p className={styles.pendiente} id={id}>
            {catalogos[campo.optionsSource?.catalog ?? ''] === 'cargando'
              ? 'Cargando opciones…'
              : 'Las opciones de este campo estarán disponibles próximamente.'}
          </p>
        );
      } else if (campo.type === 'select') {
        control = (
          <select
            id={id}
            className={styles.control}
            value={claveDe(valor)}
            aria-invalid={invalido}
            aria-describedby={describedBy}
            onChange={(event) => {
              const elegida = opciones.find((opcion) => opcion.value === event.target.value);
              if (!elegida) onChange(esCatalogo(campo) ? null : '');
              else onChange(esCatalogo(campo) ? elegida : elegida.value);
            }}
          >
            <option value="">Seleccione…</option>
            {opciones.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        );
      } else {
        const elegidas = new Set(Array.isArray(valor) ? valor.map(claveDe) : []);
        control = (
          <fieldset className={styles.multi} id={id} aria-describedby={describedBy}>
            <legend className="visually-hidden">{campo.label}</legend>
            {opciones.map((opcion) => (
              <label key={opcion.value} className={styles.check}>
                <input
                  type="checkbox"
                  checked={elegidas.has(opcion.value)}
                  onChange={(event) => {
                    const siguiente = opciones.filter((item) =>
                      item.value === opcion.value ? event.target.checked : elegidas.has(item.value),
                    );
                    onChange(esCatalogo(campo) ? siguiente : siguiente.map((item) => item.value));
                  }}
                />
                {opcion.label}
              </label>
            ))}
          </fieldset>
        );
      }
      break;
    default:
      control = (
        <input
          id={id}
          className={styles.control}
          type="text"
          value={typeof valor === 'string' ? valor : ''}
          aria-invalid={invalido}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      );
  }

  return (
    <div className={styles.campo}>
      {campo.type === 'multi_select' || campo.type === 'boolean' ? (
        <span className={styles.etiqueta}>{etiqueta}</span>
      ) : (
        <label className={styles.etiqueta} htmlFor={id}>
          {etiqueta}
        </label>
      )}
      {control}
      {campo.help && (
        <small id={ayudaId} className={styles.ayuda}>
          {campo.help}
        </small>
      )}
      {propios.map((hallazgo) => (
        <small
          key={hallazgo.mensaje}
          id={errorId}
          className={hallazgo.severidad === 'error' ? styles.error : styles.aviso}
        >
          {hallazgo.mensaje}
        </small>
      ))}
    </div>
  );
}
