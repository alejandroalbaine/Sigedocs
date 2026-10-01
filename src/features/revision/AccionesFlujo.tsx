import { useState } from 'react';
import { dossiersApi } from '../../common/api/dossiers.ts';
import type {
  AvailableTransition,
  Dossier,
  TransitionResult,
} from '../../common/api/dossierContract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { Alert, Button } from '../../common/components/index.ts';
import { CODIGOS_DECISION } from './reglas.ts';
import styles from './revision.module.css';

interface AccionesFlujoProps {
  dossier: Dossier;
  transiciones: readonly AvailableTransition[];
  onRealizada: (resultado: TransitionResult) => void;
}

/**
 * Transiciones que el servidor ofrece a este usuario, salvo las decisiones técnicas que tienen
 * su propio panel (iniciar revisión, reenviar, reevaluar, pilotaje, finalizar, archivar).
 */
export function AccionesFlujo({ dossier, transiciones, onRealizada }: AccionesFlujoProps) {
  // T1 (ASSIGN) necesita elegir especialista: la ejecuta el bloque de asignación.
  const otras = transiciones.filter(
    (item) => !CODIGOS_DECISION.includes(item.code) && item.code !== 'ASSIGN',
  );
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState('');
  const [error, setError] = useState('');

  async function ejecutar(transicion: AvailableTransition) {
    const observation = observaciones[transicion.transitionId]?.trim() ?? '';
    if (transicion.requiresObservation && !observation) {
      setError(`"${transicion.name}" exige una observación.`);
      return;
    }
    setEnviando(transicion.transitionId);
    setError('');
    try {
      const { data } = await dossiersApi.transition(dossier.dossierId, {
        transitionId: transicion.transitionId,
        versionId: dossier.currentVersion.versionId,
        ...(observation ? { observation } : {}),
      });
      onRealizada(data);
    } catch (reason) {
      setError(errorMessage(reason, 'No fue posible registrar la transición.'));
    } finally {
      setEnviando('');
    }
  }

  if (otras.length === 0) {
    return (
      <p className={styles.counter}>No hay otras acciones disponibles para su usuario ahora.</p>
    );
  }

  return (
    <div className={styles.flowActions}>
      {error && <Alert kind="error">{error}</Alert>}
      {otras.map((transicion) => (
        <div key={transicion.transitionId} className={styles.flowAction}>
          <div>
            <strong>{transicion.name}</strong>
            <small className={styles.flowHint}>Pasa a: {transicion.toState.name}</small>
          </div>
          {transicion.requiresObservation && (
            <textarea
              aria-label={`Observación para ${transicion.name}`}
              className={styles.flowObservation}
              value={observaciones[transicion.transitionId] ?? ''}
              onChange={(event) => {
                setObservaciones((current) => ({
                  ...current,
                  [transicion.transitionId]: event.target.value,
                }));
              }}
              placeholder="Observación obligatoria…"
            />
          )}
          <Button
            size="sm"
            loading={enviando === transicion.transitionId}
            disabled={Boolean(enviando) && enviando !== transicion.transitionId}
            onClick={() => void ejecutar(transicion)}
          >
            {transicion.name}
          </Button>
        </div>
      ))}
    </div>
  );
}
