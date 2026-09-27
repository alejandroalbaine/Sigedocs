import { useState } from 'react';
import { dossiersApi, esRutaPendiente } from '../../common/api/dossiers.ts';
import type { Dossier, Observation } from '../../common/api/dossierContract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { Alert, Button, Field, type AlertKind } from '../../common/components/index.ts';
import { admiteDecisionTecnica } from '../../common/workflow/estados.ts';
import styles from './observaciones.module.css';

interface FormularioObservacionProps {
  dossier: Dossier;
  onRegistrada?: (observacion: Observation) => void;
}

/**
 * WF-04: `POST /dossiers/{id}/observations` sobre la versión vigente. Solo se observa una
 * versión En revisión o En reevaluación; autor y fecha los asigna el servidor, y las
 * observaciones no se editan ni se borran.
 */
export function FormularioObservacion({ dossier, onRegistrada }: FormularioObservacionProps) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ kind: AlertKind; texto: string } | null>(null);
  const habilitado = admiteDecisionTecnica(dossier.currentState.code);

  async function registrar() {
    if (!texto.trim()) {
      setAviso({ kind: 'error', texto: 'Describa la observación antes de registrarla.' });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      const { data } = await dossiersApi.addObservation(dossier.dossierId, {
        versionId: dossier.currentVersion.versionId,
        text: texto.trim(),
      });
      setTexto('');
      setAviso({ kind: 'success', texto: 'Observación registrada.' });
      onRegistrada?.(data);
    } catch (reason) {
      setAviso({
        kind: esRutaPendiente(reason) ? 'info' : 'error',
        texto: esRutaPendiente(reason)
          ? 'No se registró: el servidor aún no implementa la ruta de observaciones.'
          : errorMessage(reason, 'No fue posible registrar la observación.'),
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void registrar();
      }}
    >
      <fieldset className={styles.form} disabled={!habilitado}>
        <legend className="visually-hidden">Nueva observación</legend>
        {!habilitado && (
          <Alert kind="info">
            Solo se registran observaciones cuando el expediente está En revisión o En reevaluación.
            Estado actual: {dossier.currentState.name}.
          </Alert>
        )}
        <Field
          label={`Observación sobre ${dossier.code} · ${dossier.currentVersion.label}`}
          help="El autor y la fecha los asigna el servidor. Las observaciones no se editan."
        >
          {(control) => (
            <textarea
              {...control}
              rows={4}
              value={texto}
              placeholder="Describa el hallazgo, el criterio afectado y la corrección esperada…"
              onChange={(event) => {
                setTexto(event.target.value);
              }}
            />
          )}
        </Field>
        {aviso && <Alert kind={aviso.kind}>{aviso.texto}</Alert>}
        <div className={styles.actions}>
          <Button type="submit" size="sm" loading={enviando}>
            Registrar observación
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
