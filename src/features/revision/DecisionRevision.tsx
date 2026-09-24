import { useState } from 'react';
import { Alert, type AlertKind } from '../../common/components/Alert/Alert.tsx';
import { Button } from '../../common/components/Button/Button.tsx';
import { Field } from '../../common/components/Field/Field.tsx';
import { validarAccion, type AccionRevision } from './reglas.ts';
import styles from './revision.module.css';

export interface DecisionRevisionProps {
  /** Si todos los requisitos del checklist están verificados. */
  checklistCompleto: boolean;
}

export function DecisionRevision({ checklistCompleto }: DecisionRevisionProps) {
  const [observaciones, setObservaciones] = useState('');
  const [aviso, setAviso] = useState<{ kind: AlertKind; texto: string } | null>(null);

  function preparar(accion: AccionRevision) {
    setAviso(validarAccion(accion, observaciones, checklistCompleto));
  }

  return (
    <div className={styles.decision}>
      <Field label="Observaciones del revisor">
        {(control) => (
          <textarea
            {...control}
            value={observaciones}
            placeholder="Escriba las observaciones encontradas durante la revisión…"
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
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            preparar('correccion');
          }}
        >
          Solicitar corrección
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            preparar('rechazo');
          }}
        >
          Rechazar
        </Button>
        <Button
          size="sm"
          onClick={() => {
            preparar('aprobacion');
          }}
        >
          Aprobar revisión
        </Button>
      </div>
    </div>
  );
}
