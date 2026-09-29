import { useState } from 'react';
import { usersApi } from '../../common/api/users.ts';
import type { ManagedUser } from '../../common/api/userContract.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser, useSession } from '../../common/auth/SessionContext.ts';
import { Alert, Button, Card, PageHeader } from '../../common/components/index.ts';
import { EstadoUsuario } from '../../features/usuarios/EstadoUsuario.tsx';
import { FiltrosUsuarios } from '../../features/usuarios/FiltrosUsuarios.tsx';
import { FormularioUsuario } from '../../features/usuarios/FormularioUsuario.tsx';
import {
  FILTROS_VACIOS,
  filtrosServidor,
  opcionesDeRol,
  type FiltrosUsuarios as Filtros,
} from '../../features/usuarios/reglas.ts';
import { RolesUsuario } from '../../features/usuarios/RolesUsuario.tsx';
import { TablaUsuarios } from '../../features/usuarios/TablaUsuarios.tsx';
import featureStyles from '../../features/usuarios/usuarios.module.css';
import styles from '../layout/page.module.css';

type Accion =
  { tipo: 'crear' } | { tipo: 'editar' | 'roles' | 'estado'; usuario: ManagedUser } | null;

/** CU-12: administración de usuarios institucionales (`/users`, CORE-01/CORE-02). */
function Usuarios() {
  const actual = useCurrentUser();
  const { roleNames } = useSession();
  const opciones = opcionesDeRol(roleNames);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  // Paginación por cursor: se guardan los cursores ya visitados para poder volver.
  const [cursores, setCursores] = useState<(string | undefined)[]>([undefined]);
  const [accion, setAccion] = useState<Accion>(null);
  const [aviso, setAviso] = useState('');
  const pagina = cursores.length;
  const cursor = cursores[pagina - 1];
  const consulta = { ...filtrosServidor(filtros), ...(cursor ? { cursor } : {}) };
  const usuarios = useRecurso(
    () => usersApi.list(consulta).then((respuesta) => ({ data: respuesta })),
    [consulta],
  );
  const siguiente = usuarios.data?.meta?.pagination?.nextCursor ?? null;

  function aplicar(siguientes: Filtros) {
    setFiltros(siguientes);
    setCursores([undefined]);
  }

  function guardado(mensaje: string) {
    setAccion(null);
    setAviso(mensaje);
    usuarios.reload();
  }

  function cerrar() {
    setAccion(null);
  }

  return (
    <>
      <Card title="Filtros y búsqueda">
        <FiltrosUsuarios roles={opciones} valor={filtros} onAplicar={aplicar} />
      </Card>
      <Card
        title="Usuarios institucionales"
        description="Alta, edición, estado y roles de las cuentas de SIGESDOC."
        actions={
          <Button
            variant="accent"
            disabled={usuarios.pendiente || opciones.length === 0}
            onClick={() => {
              setAviso('');
              setAccion({ tipo: 'crear' });
            }}
          >
            Nuevo usuario
          </Button>
        }
      >
        {opciones.length === 0 && (
          <Alert kind="warning">
            No se pudo consultar el catálogo de roles; no es posible crear usuarios ni asignar roles
            hasta que responda.
          </Alert>
        )}
        {aviso && <Alert kind="success">{aviso}</Alert>}
        {usuarios.pendiente ? (
          <Alert kind="info">
            La gestión de usuarios está confirmada en el contrato, pero el servidor aún no la
            implementa. No se muestran usuarios simulados.
          </Alert>
        ) : usuarios.error ? (
          <Alert kind="error">{usuarios.error}</Alert>
        ) : (
          <>
            <TablaUsuarios
              usuarios={usuarios.data?.data ?? []}
              actualId={actual.userId}
              vacio={
                usuarios.loading ? 'Consultando usuarios…' : 'No hay usuarios para los filtros.'
              }
              onEditar={(usuario) => {
                setAviso('');
                setAccion({ tipo: 'editar', usuario });
              }}
              onRoles={(usuario) => {
                setAviso('');
                setAccion({ tipo: 'roles', usuario });
              }}
              onEstado={(usuario) => {
                setAviso('');
                setAccion({ tipo: 'estado', usuario });
              }}
            />
            <nav className={featureStyles.pager} aria-label="Paginación de usuarios">
              <span>Página {pagina}</span>
              <Button
                size="sm"
                variant="quiet"
                disabled={pagina <= 1}
                onClick={() => {
                  setCursores((actuales) => actuales.slice(0, -1));
                }}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="quiet"
                disabled={!siguiente || usuarios.loading}
                onClick={() => {
                  if (siguiente) setCursores((actuales) => [...actuales, siguiente]);
                }}
              >
                Siguiente
              </Button>
            </nav>
          </>
        )}
      </Card>
      {accion?.tipo === 'crear' && (
        <FormularioUsuario
          usuario={null}
          opciones={opciones}
          onCerrar={cerrar}
          onGuardado={guardado}
        />
      )}
      {accion?.tipo === 'editar' && (
        <FormularioUsuario
          key={accion.usuario.userId}
          usuario={accion.usuario}
          opciones={opciones}
          onCerrar={cerrar}
          onGuardado={guardado}
        />
      )}
      {accion?.tipo === 'roles' && (
        <RolesUsuario
          key={accion.usuario.userId}
          usuario={accion.usuario}
          opciones={opciones}
          onCerrar={cerrar}
          onGuardado={guardado}
        />
      )}
      {accion?.tipo === 'estado' && (
        <EstadoUsuario
          key={accion.usuario.userId}
          usuario={accion.usuario}
          onCerrar={cerrar}
          onGuardado={guardado}
        />
      )}
    </>
  );
}

export function UsuariosPage() {
  return (
    <div className={styles.stack}>
      <title>Usuarios y roles | SIGESDOC</title>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y roles"
        description="Cuentas institucionales, su estado y los roles que determinan sus permisos."
      />
      <RequirePermission permission="users.manage" action="administrar usuarios">
        <Usuarios />
      </RequirePermission>
    </div>
  );
}
