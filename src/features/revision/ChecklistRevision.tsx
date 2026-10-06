import {
  CRITERIOS,
  OPCIONES_RESULTADO,
  resumirChecklist,
  type ResultadoCriterio,
} from './reglas.ts';
import styles from './revision.module.css';

export interface ChecklistRevisionProps {
  resultados: readonly ResultadoCriterio[];
  onChange: (indice: number, resultado: Exclude<ResultadoCriterio, null>) => void;
  disabled?: boolean;
}

export function ChecklistRevision({
  resultados,
  onChange,
  disabled = false,
}: ChecklistRevisionProps) {
  const { evaluados, noCumple, total } = resumirChecklist(resultados);

  return (
    <div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Criterios evaluados"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={evaluados}
      >
        <div className={styles.bar} style={{ width: `${(evaluados / total) * 100}%` }} />
      </div>
      <p className={styles.counter}>
        {evaluados} de {total} criterios evaluados
        {noCumple > 0 && <strong className={styles.noCumple}> · {noCumple} no cumple</strong>}
      </p>
      <div className={styles.checklist}>
        {CRITERIOS.map((criterio, indice) => (
          <fieldset key={criterio.id} className={styles.criterio} disabled={disabled}>
            <legend>
              {criterio.texto}
              <small>Contrastar con: {criterio.referencia}</small>
            </legend>
            <div className={styles.verdicts}>
              {OPCIONES_RESULTADO.map((opcion) => (
                <label key={opcion.valor} className={styles.verdict} data-valor={opcion.valor}>
                  <input
                    type="radio"
                    name={`criterio-${criterio.id}`}
                    value={opcion.valor}
                    checked={resultados[indice] === opcion.valor}
                    onChange={() => {
                      onChange(indice, opcion.valor);
                    }}
                  />
                  {opcion.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
