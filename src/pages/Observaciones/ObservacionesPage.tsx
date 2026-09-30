import { useState } from 'react';
import { dossiersApi } from '../../common/api/dossiers.ts';
import type { Observation } from '../../common/api/dossierContract.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import {
  Alert,
  Card,
  DataTable,
  Field,
  PageHeader,
  type Column,
} from '../../common/components/index.ts';
import { admiteDecisionTecnica } from '../../common/workflow/estados.ts';
import { FormularioObservacion } from '../../features/observaciones/FormularioObservacion.tsx';
import { EnPreparacion } from '../documental/EnPreparacion.tsx';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from '../layout/page.module.css';

const COLUMNAS: readonly Column<Observation>[] = [
  { key: 'text', header: 'Observación', render: (fila) => fila.text },
  {
    key: 'ubicacion',
    header: 'Sección / campo',
    render: (fila) => [fila.sectionKey, fila.fieldKey].filter(Boolean).join(' · ') || '—',
  },
  { key: 'autor', header: 'Registrada por', render: (fila) => fila.createdBy?.name ?? '—' },
  {
    key: 'fecha',
    header: 'Fecha',
    render: (fila) => (fila.createdAt ? new Date(fila.createdAt).toLocaleString('es-DO') : '—'),
  },
];

function Observaciones() {
  const { items, loading, error, pendiente } = useDossiers();
  const revisables = items.filter((item) => admiteDecisionTecnica(item.currentState.code));
  const [elegido, setElegido] = useState('');
  const dossier =
    revisables.find((item) => item.dossierId === elegido) ?? revisables[0] ?? undefined;
  const lista = useRecurso(
    dossier
      ? () => dossiersApi.observations(dossier.dossierId, dossier.currentVersion.versionId)
      : null,
    [dossier?.dossierId, dossier?.currentVersion.versionId],
  );

  if (loading) return <p>Consultando expedientes…</p>;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (pendiente) return <EnPreparacion />;
  if (!dossier) {
    return (
      <Alert kind="info">
        Ningún expediente visible está En revisión o En reevaluación: solo en esas etapas se
        registran observaciones.
      </Alert>
    );
  }

  return (
    <>
      <Card title="Nueva observación">
        <Field label="Expediente en revisión">
          {(control) => (
            <select
              {...control}
              value={dossier.dossierId}
              onChange={(event) => {
                setElegido(event.target.value);
              }}
            >
              {revisables.map((item) => (
                <option key={item.dossierId} value={item.dossierId}>
                  {item.code} · {item.title} ({item.currentState.name})
                </option>
              ))}
            </select>
          )}
        </Field>
        <FormularioObservacion
          key={dossier.dossierId}
          dossier={dossier}
          onRegistrada={lista.reload}
        />
      </Card>
      <Card title={`Observaciones de ${dossier.code} · ${dossier.currentVersion.label}`}>
        {lista.pendiente ? (
          <EnPreparacion modulo="La consulta de observaciones" />
        ) : lista.error ? (
          <Alert kind="error">{lista.error}</Alert>
        ) : (
          <DataTable
            caption="Observaciones de la versión vigente"
            columns={COLUMNAS}
            rows={lista.data ?? []}
            getRowKey={(fila) => fila.observationId}
            emptyMessage={lista.loading ? 'Consultando…' : 'Sin observaciones en esta versión.'}
            minWidth={620}
          />
        )}
      </Card>
    </>
  );
}

export function ObservacionesPage() {
  return (
    <div className={styles.stack}>
      <title>Registro de observaciones | SIGESDOC</title>
      <PageHeader
        eyebrow="Expedientes"
        title="Registro de observaciones"
        description="Hallazgos de la revisión técnico-curricular sobre la versión vigente."
      />
      <RequirePermission permission="observations.create" action="registrar observaciones">
        <Observaciones />
      </RequirePermission>
    </div>
  );
}
