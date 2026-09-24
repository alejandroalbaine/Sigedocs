import { REQUISITOS } from './reglas.ts';
import styles from './revision.module.css';

export interface ChecklistRevisionProps {
  verificados: readonly boolean[];
  onChange: (indice: number, verificado: boolean) => void;
}

export function ChecklistRevision({ verificados, onChange }: ChecklistRevisionProps) {
  const completados = verificados.filter(Boolean).length;
  const porcentaje = (completados / REQUISITOS.length) * 100;

  return (
    <div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Requisitos verificados"
        aria-valuemin={0}
        aria-valuemax={REQUISITOS.length}
        aria-valuenow={completados}
      >
        <div className={styles.bar} style={{ width: `${porcentaje}%` }} />
      </div>
      <p className={styles.counter}>
        {completados} de {REQUISITOS.length} requisitos verificados
      </p>
      <fieldset className={styles.checklist}>
        <legend className="visually-hidden">Checklist de revisión</legend>
        {REQUISITOS.map((requisito, indice) => (
          <label key={requisito} className={styles.option}>
            <input
              type="checkbox"
              checked={verificados[indice] ?? false}
              onChange={(event) => {
                onChange(indice, event.target.checked);
              }}
            />
            {requisito}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
