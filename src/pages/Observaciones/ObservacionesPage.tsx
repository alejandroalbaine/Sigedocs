import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { Alert, Card, DataTable, PageHeader, type Column } from '../../common/components/index.ts';
import { FormularioObservacion } from '../../features/observaciones/FormularioObservacion.tsx';
import styles from '../layout/page.module.css';

interface Observacion {
  id: string;
  expediente: string;
  descripcion: string;
  estado: string;
  autor: string;
  fecha: string;
}

const COLUMNAS: readonly Column<Observacion>[] = [
  { key: 'expediente', header: 'Expediente', render: (fila) => fila.expediente },
  { key: 'descripcion', header: 'Descripción', render: (fila) => fila.descripcion },
  { key: 'estado', header: 'Estado', render: (fila) => fila.estado },
  { key: 'autor', header: 'Registrado por', render: (fila) => fila.autor },
  { key: 'fecha', header: 'Fecha', render: (fila) => fila.fecha },
];

function Observaciones() {
  const user = useCurrentUser();
  return (
    <>
      <Alert kind="info">
        El registro permanecerá deshabilitado hasta que el backend publique las rutas de expedientes
        y observaciones.
      </Alert>
      <Card title="Nueva observación">
        <FormularioObservacion autor={user.name} />
      </Card>
      <Card title="Últimas observaciones registradas">
        <DataTable
          caption="Últimas observaciones registradas"
          columns={COLUMNAS}
          rows={[]}
          getRowKey={(fila) => fila.id}
          emptyMessage="No hay observaciones disponibles."
          minWidth={620}
        />
      </Card>
    </>
  );
}

export function ObservacionesPage() {
  return (
    <div className={styles.stack}>
      <title>Registro de observaciones | SIGESDOC</title>
      <PageHeader eyebrow="Expedientes" title="Registro de observaciones" />
      <RequirePermission permission="expedientes.editar" action="registrar observaciones">
        <Observaciones />
      </RequirePermission>
    </div>
  );
}
