import { useState } from 'react';
import { dossiersApi, esRutaPendiente } from '../../common/api/dossiers.ts';
import type { AvailableTransition, Dossier } from '../../common/api/dossierContract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { Alert, Button, Field } from '../../common/components/index.ts';
import styles from './revision.module.css';

interface AsignacionProps {
  dossier: Dossier;
  /** Transiciones que el servidor ofrece; puede incluir T1 (ASSIGN). */
  transiciones: readonly AvailableTransition[] | null;
  onAsignado: () => void;
}

/**
 * CU-03 / WF-03: la Dirección asigna el expediente a un especialista curricular.
 * Backend aún decide la forma (plan, decisiones pendientes): se usa
 * `POST /dossiers/{id}/assignments` y, si esa ruta no existe pero el servidor ofrece T1
 * (ASSIGN), se ejecuta como transición con `specialistId` en el cuerpo.
 */
export function AsignacionExpediente({ dossier, transiciones, onAsignado }: AsignacionProps) {
  const especialistas = useRecurso(
    () => dossiersApi.specialists(dossier.dossierId),
    [dossier.dossierId],
  );
  const [seleccion, setSeleccion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ kind: 'error' | 'success'; texto: string } | null>(null);

  async function asignar() {
    if (!seleccion) {
      setAviso({ kind: 'error', texto: 'Seleccione un especialista curricular.' });
      return;
    }
    setEnviando(true);
    setAviso(null);
    const nombre =
      especialistas.data?.find((usuario) => usuario.userId === seleccion)?.name ??
      'el especialista seleccionado';
    const t1 = transiciones?.find((item) => item.code === 'ASSIGN');
    try {
      try {
        const { data } = await dossiersApi.assign(dossier.dossierId, seleccion);
        setAviso({ kind: 'success', texto: `Expediente asignado a ${data.specialist.name}.` });
      } catch (reason) {
        if (!t1 || !esRutaPendiente(reason)) throw reason;
        await dossiersApi.transition(dossier.dossierId, {
          transitionId: t1.transitionId,
          versionId: dossier.currentVersion.versionId,
          specialistId: seleccion,
        });
        setAviso({ kind: 'success', texto: `Expediente asignado a ${nombre}.` });
      }
      onAsignado();
    } catch (reason) {
      setAviso({ kind: 'error', texto: errorMessage(reason, 'No fue posible asignar.') });
    } finally {
      setEnviando(false);
    }
  }

  if (especialistas.pendiente) {
    return (
      <p className={styles.counter}>
        La asignación de especialistas está en preparación y aparecerá aquí en cuanto esté
        disponible.
      </p>
    );
  }

  return (
    <div className={styles.decision}>
      {especialistas.error && <Alert kind="error">{especialistas.error}</Alert>}
      <Field
        label="Especialista curricular"
        help={
          dossier.assignedSpecialist
            ? `Asignado actualmente: ${dossier.assignedSpecialist.name}. Reasignar conserva el historial.`
            : 'El expediente aún no tiene especialista asignado.'
        }
      >
        {(control) => (
          <select
            {...control}
            value={seleccion}
            disabled={especialistas.loading}
            onChange={(event) => {
              setSeleccion(event.target.value);
            }}
          >
            <option value="">
              {especialistas.loading ? 'Consultando especialistas…' : 'Seleccione…'}
            </option>
            {(especialistas.data ?? []).map((usuario) => (
              <option key={usuario.userId} value={usuario.userId}>
                {usuario.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      {aviso && <Alert kind={aviso.kind}>{aviso.texto}</Alert>}
      <div className={styles.actions}>
        <Button size="sm" loading={enviando} onClick={() => void asignar()}>
          {dossier.assignedSpecialist ? 'Reasignar' : 'Asignar'}
        </Button>
      </div>
    </div>
  );
}
