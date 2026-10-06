import { useState } from 'react';
import { dossiersApi, esRutaPendiente } from '../../common/api/dossiers.ts';
import type { Dossier, Observation } from '../../common/api/dossierContract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { Alert, Button, Field, type AlertKind } from '../../common/components/index.ts';
import { admiteDecisionTecnica } from '../../common/workflow/estados.ts';
import type { SeccionObservable } from './estructura.ts';
import styles from './observaciones.module.css';

/** Límite del servidor (MAX_OBSERVATION_LENGTH, backend v0.2.0). */
export const MAX_OBSERVACION = 5000;

interface FormularioObservacionProps {
  dossier: Dossier;
  /**
   * Secciones y campos de la plantilla del expediente. Sin ellas (cargando o no disponibles)
   * la observación se registra como general, sobre toda la versión.
   */
  estructura?: readonly SeccionObservable[] | null;
  onRegistrada?: (observacion: Observation) => void;
}

/**
 * WF-04: `POST /dossiers/{id}/observations` sobre la versión vigente. Solo se observa una
 * versión En revisión o En reevaluación; autor y fecha los asigna el servidor, y las
 * observaciones no se editan ni se borran. La sección y el campo son opcionales y ubican el
 * hallazgo dentro del programa (`sectionKey`, `fieldKey`).
 */
export function FormularioObservacion({
  dossier,
  estructura,
  onRegistrada,
}: FormularioObservacionProps) {
  const [texto, setTexto] = useState('');
  const [seccion, setSeccion] = useState('');
  const [campo, setCampo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ kind: AlertKind; texto: string } | null>(null);
  const habilitado = admiteDecisionTecnica(dossier.currentState.code);
  const secciones = estructura ?? [];
  const campos = secciones.find((item) => item.key === seccion)?.fields ?? [];
  const largo = texto.trim().length;

  async function registrar() {
    if (!texto.trim()) {
      setAviso({ kind: 'error', texto: 'Describa la observación antes de registrarla.' });
      return;
    }
    if (largo > MAX_OBSERVACION) {
      setAviso({
        kind: 'error',
        texto: `La observación admite hasta ${MAX_OBSERVACION.toLocaleString('es-DO')} caracteres.`,
      });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      const { data } = await dossiersApi.addObservation(dossier.dossierId, {
        versionId: dossier.currentVersion.versionId,
        text: texto.trim(),
        ...(seccion ? { sectionKey: seccion } : {}),
        ...(seccion && campo ? { fieldKey: campo } : {}),
      });
      setTexto('');
      setAviso({ kind: 'success', texto: 'Observación registrada.' });
      onRegistrada?.(data);
    } catch (reason) {
      setAviso({
        kind: esRutaPendiente(reason) ? 'info' : 'error',
        texto: esRutaPendiente(reason)
          ? 'No se registró: el registro de observaciones aún está en preparación.'
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
        {secciones.length > 0 && (
          <div className={styles.row}>
            <Field label="Sección del programa" help="Opcional. Ubica el hallazgo en el programa.">
              {(control) => (
                <select
                  {...control}
                  value={seccion}
                  onChange={(event) => {
                    setSeccion(event.target.value);
                    setCampo('');
                  }}
                >
                  <option value="">Observación general</option>
                  {secciones.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Campo" help="Opcional. Primero elija la sección.">
              {(control) => (
                <select
                  {...control}
                  value={campo}
                  disabled={!seccion || campos.length === 0}
                  onChange={(event) => {
                    setCampo(event.target.value);
                  }}
                >
                  <option value="">Toda la sección</option>
                  {campos.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        )}
        <Field
          label={`Observación sobre ${dossier.code} · ${dossier.currentVersion.label}`}
          help={`El autor y la fecha los asigna el servidor. Las observaciones no se editan. ${largo.toLocaleString('es-DO')} / ${MAX_OBSERVACION.toLocaleString('es-DO')} caracteres.`}
        >
          {(control) => (
            <textarea
              {...control}
              rows={4}
              value={texto}
              maxLength={MAX_OBSERVACION}
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
