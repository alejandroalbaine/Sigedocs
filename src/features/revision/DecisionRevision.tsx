import { useState } from 'react';
import { dossiersApi, esRutaPendiente } from '../../common/api/dossiers.ts';
import type {
  AvailableTransition,
  Dossier,
  TransitionResult,
} from '../../common/api/dossierContract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import type { Recurso } from '../../common/api/useRecurso.ts';
import { Alert, Button, Field, type AlertKind } from '../../common/components/index.ts';
import {
  componerObservacion,
  TRANSICIONES_DECISION,
  validarAccion,
  type AccionRevision,
  type ResultadoCriterio,
} from './reglas.ts';
import styles from './revision.module.css';

interface DecisionRevisionProps {
  dossier: Dossier;
  resultados: readonly ResultadoCriterio[];
  transiciones: Recurso<AvailableTransition[]>;
  puedeDevolver: boolean;
  puedeAprobar: boolean;
  onRealizada: (resultado: TransitionResult) => void;
}

/**
 * Devuelve o aprueba para pilotaje con `POST /dossiers/{id}/transitions` (ADR-014 T3/T4/T7/T8).
 * Cuando el servidor publica las transiciones disponibles, solo se muestran las que ofrece;
 * mientras esa ruta esté pendiente, se muestran según permisos y se avisa que no se envían.
 */
export function DecisionRevision({
  dossier,
  resultados,
  transiciones,
  puedeDevolver,
  puedeAprobar,
  onRealizada,
}: DecisionRevisionProps) {
  const [observaciones, setObservaciones] = useState('');
  const [aviso, setAviso] = useState<{ kind: AlertKind; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  function transicionPara(accion: AccionRevision) {
    return transiciones.data?.find((item) => TRANSICIONES_DECISION[accion].includes(item.code));
  }

  const visible = (accion: AccionRevision, permitido: boolean) =>
    transiciones.data ? Boolean(transicionPara(accion)) : permitido;
  const mostrarDevolver = visible('devolver', puedeDevolver);
  const mostrarAprobar = visible('aprobar', puedeAprobar);

  async function decidir(accion: AccionRevision) {
    const error = validarAccion(accion, observaciones, resultados);
    if (error) {
      setAviso(error);
      return;
    }
    const transicion = transicionPara(accion);
    if (!transicion) {
      setAviso({
        kind: 'info',
        texto:
          'La decisión cumple las reglas, pero no se envió: el servidor todavía no publica las transiciones del expediente.',
      });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      const { data } = await dossiersApi.transition(dossier.dossierId, {
        transitionId: transicion.transitionId,
        versionId: dossier.currentVersion.versionId,
        observation: componerObservacion(resultados, observaciones),
      });
      onRealizada(data);
    } catch (reason) {
      setAviso({
        kind: esRutaPendiente(reason) ? 'info' : 'error',
        texto: esRutaPendiente(reason)
          ? 'La decisión no se envió: el servidor aún no implementa la ruta de transiciones.'
          : errorMessage(reason, 'No fue posible registrar la decisión.'),
      });
    } finally {
      setEnviando(false);
    }
  }

  if (transiciones.loading) {
    return <p className={styles.counter}>Consultando las acciones disponibles…</p>;
  }

  if (!mostrarDevolver && !mostrarAprobar) {
    return (
      <p className={styles.counter}>
        {transiciones.data
          ? 'El servidor no ofrece decisiones técnicas para su usuario en el estado actual.'
          : 'Su rol puede consultar este expediente, pero no emitir decisiones técnicas.'}
      </p>
    );
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
        {mostrarDevolver && (
          <Button
            variant="secondary"
            size="sm"
            disabled={enviando}
            onClick={() => void decidir('devolver')}
          >
            Devolver con observaciones
          </Button>
        )}
        {mostrarAprobar && (
          <Button
            variant="accent"
            size="sm"
            loading={enviando}
            onClick={() => void decidir('aprobar')}
          >
            Aprobar para pilotaje
          </Button>
        )}
      </div>
    </div>
  );
}
