import { useState } from 'react';
import { Alert, Button, Field, type AlertKind } from '../../common/components/index.ts';
import { validarAccion, type AccionRevision, type ResultadoCriterio } from './reglas.ts';
import styles from './revision.module.css';

interface DecisionRevisionProps {
  resultados: readonly ResultadoCriterio[];
  puedeDevolver: boolean;
  puedeAprobar: boolean;
}

export function DecisionRevision({
  resultados,
  puedeDevolver,
  puedeAprobar,
}: DecisionRevisionProps) {
  const [observaciones, setObservaciones] = useState('');
  const [aviso, setAviso] = useState<{ kind: AlertKind; texto: string } | null>(null);

  function preparar(accion: AccionRevision) {
    setAviso(validarAccion(accion, observaciones, resultados));
  }

  return (
    <div className={styles.decision}>
      <Field label="Observaciones del revisor">
        {(control) => (
          <textarea
            {...control}
            value={observaciones}
            placeholder="Describa cada incumplimiento y la corrección esperada…"
            onChange={(event) => {
              setObservaciones(event.target.value);
            }}
          />
        )}
      </Field>

      {aviso && <Alert kind={aviso.kind}>{aviso.texto}</Alert>}

      <div className={styles.actions}>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            preparar('borrador');
          }}
        >
          Guardar borrador
        </Button>
        {puedeDevolver && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              preparar('devolver');
            }}
          >
            Devolver con observaciones
          </Button>
        )}
        {puedeAprobar && (
          <Button
            size="sm"
            onClick={() => {
              preparar('aprobar');
            }}
          >
            Aprobar para pilotaje
          </Button>
        )}
      </div>
    </div>
  );
}
