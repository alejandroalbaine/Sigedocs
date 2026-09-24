import { useState } from 'react';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { Alert, Badge, Card, EmptyState, PageHeader } from '../../common/components/index.ts';
import { ChecklistRevision } from '../../features/revision/ChecklistRevision.tsx';
import { REQUISITOS } from '../../features/revision/reglas.ts';
import { DecisionRevision } from '../../features/revision/DecisionRevision.tsx';
import page from '../layout/page.module.css';
import styles from './RevisionPage.module.css';

function Revision() {
  const user = useCurrentUser();
  const [verificados, setVerificados] = useState<boolean[]>(() => REQUISITOS.map(() => false));

  return (
    <>
      <Alert kind="info">
        Vista demostrativa: el expediente no procede del backend y las decisiones no se guardan
        hasta que se publique el contrato de revisiones.
      </Alert>

      <Card title="Expediente" actions={<Badge tone="warning">Ejemplo</Badge>}>
        <dl className={styles.summary}>
          <div>
            <dt>Número</dt>
            <dd>EXP-0000-000000</dd>
          </div>
          <div>
            <dt>Tipo de trámite</dt>
            <dd>Trámite de ejemplo</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <Badge tone="info">En revisión</Badge>
            </dd>
          </div>
          <div>
            <dt>Revisor</dt>
            <dd>{user.name}</dd>
          </div>
        </dl>
      </Card>

      <div className={styles.grid}>
        <Card title="Documentos del expediente">
          <div className={styles.viewer}>
            La vista previa se habilitará cuando el backend entregue los documentos autorizados.
          </div>
        </Card>

        <Card title="Checklist de revisión">
          <ChecklistRevision
            verificados={verificados}
            onChange={(indice, verificado) => {
              setVerificados((actual) =>
                actual.map((valor, i) => (i === indice ? verificado : valor)),
              );
            }}
          />
          <h3 className={styles.sectionTitle}>Dictamen</h3>
          <DecisionRevision checklistCompleto={verificados.every(Boolean)} />
        </Card>
      </div>

      <Card title="Historial de revisión">
        <EmptyState title="Sin eventos">
          No hay eventos disponibles hasta que el backend publique el contrato de revisiones.
        </EmptyState>
      </Card>
    </>
  );
}

export function RevisionPage() {
  return (
    <div className={page.stack}>
      <title>Revisión de expediente | SIGESDOC</title>
      <PageHeader eyebrow="Expedientes" title="Revisión de expediente" />
      <RequirePermission permission="expedientes.aprobar" action="revisar expedientes">
        <Revision />
      </RequirePermission>
    </div>
  );
}
