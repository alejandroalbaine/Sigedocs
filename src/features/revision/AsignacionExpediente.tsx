import { useState } from 'react';
import { dossiersApi } from '../../common/api/dossiers.ts';
import type { Dossier } from '../../common/api/dossierContract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { Alert, Button, Field } from '../../common/components/index.ts';
import styles from './revision.module.css';

interface AsignacionProps {
  dossier: Dossier;
  onAsignado: () => void;
}

/**
 * CU-03 / WF-03: la Dirección asigna el expediente a un especialista curricular con
 * `POST /dossiers/{id}/assignments`; si está Recepcionado, el servidor ejecuta T1 (ASSIGN).
 */
export function AsignacionExpediente({ dossier, onAsignado }: AsignacionProps) {
  const especialistas = useRecurso(() => dossiersApi.specialists(), []);
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
    try {
      const { data } = await dossiersApi.assign(dossier.dossierId, seleccion);
      setAviso({ kind: 'success', texto: `Expediente asignado a ${data.specialist.name}.` });
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
        La asignación se habilitará cuando el servidor publique la consulta de usuarios y la ruta de
        asignaciones.
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
