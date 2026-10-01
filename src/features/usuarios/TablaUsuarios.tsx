import type { ManagedUser } from '../../common/api/userContract.ts';
import { Badge, Button, DataTable, type Column } from '../../common/components/index.ts';
import { formatDateTime } from '../../common/utils/format.ts';
import styles from './usuarios.module.css';

export interface TablaUsuariosProps {
  usuarios: readonly ManagedUser[];
  /** Usuario de la sesión: no puede cambiar sus propios roles ni desactivarse. */
  actualId: string;
  vacio: string;
  onEditar: (usuario: ManagedUser) => void;
  onRoles: (usuario: ManagedUser) => void;
  onEstado: (usuario: ManagedUser) => void;
}

export function TablaUsuarios({
  usuarios,
  actualId,
  vacio,
  onEditar,
  onRoles,
  onEstado,
}: TablaUsuariosProps) {
  const columnas: Column<ManagedUser>[] = [
    {
      key: 'usuario',
      header: 'Usuario',
      render: (usuario) => (
        <>
          <span className={styles.cellTitle}>
            {usuario.name}
            {usuario.userId === actualId && ' (usted)'}
          </span>
          <span className={styles.cellSub}>{usuario.email}</span>
        </>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (usuario) =>
        usuario.roles.length ? (
          <span className={styles.roles}>
            {usuario.roles.map((rol) => (
              <Badge key={rol.code} tone="info">
                {rol.name}
              </Badge>
            ))}
          </span>
        ) : (
          <Badge tone="warning">Sin rol</Badge>
        ),
    },
    { key: 'escuela', header: 'Escuela', render: (usuario) => usuario.schoolCode ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (usuario) =>
        usuario.isActive ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>,
    },
    { key: 'alta', header: 'Alta', render: (usuario) => formatDateTime(usuario.createdAt) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (usuario) => {
        const propio = usuario.userId === actualId;
        return (
          <span className={styles.rowActions}>
            <Button
              size="sm"
              variant="quiet"
              aria-label={`Editar a ${usuario.name}`}
              onClick={() => {
                onEditar(usuario);
              }}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="quiet"
              disabled={propio}
              title={propio ? 'Nadie puede cambiar sus propios roles.' : undefined}
              aria-label={`Roles de ${usuario.name}`}
              onClick={() => {
                onRoles(usuario);
              }}
            >
              Roles
            </Button>
            <Button
              size="sm"
              variant={usuario.isActive ? 'danger' : 'secondary'}
              disabled={propio}
              title={propio ? 'No puede desactivar su propia cuenta.' : undefined}
              aria-label={`${usuario.isActive ? 'Desactivar' : 'Activar'} a ${usuario.name}`}
              onClick={() => {
                onEstado(usuario);
              }}
            >
              {usuario.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      caption="Usuarios institucionales"
      columns={columnas}
      rows={usuarios}
      getRowKey={(usuario) => usuario.userId}
      emptyMessage={vacio}
      minWidth={860}
    />
  );
}
