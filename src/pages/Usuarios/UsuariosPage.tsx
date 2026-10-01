import { useEffect, useState, type SyntheticEvent } from 'react';
import { UserPlus } from 'lucide-react';
import type { Role, User } from '../../common/api/contract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  PageHeader,
  TextField,
  type Column,
} from '../../common/components/index.ts';
import {
  FILTROS_VACIOS,
  listarRoles,
  listarUsuarios,
  modificarUsuario,
  type FiltrosUsuarios,
} from '../../features/usuarios/api.ts';
import { DialogoRoles } from '../../features/usuarios/DialogoRoles.tsx';
import { FormularioUsuario } from '../../features/usuarios/FormularioUsuario.tsx';
import usuariosStyles from '../../features/usuarios/usuarios.module.css';
import styles from '../layout/page.module.css';

type Dialogo = { tipo: 'crear' } | { tipo: 'editar' | 'roles'; usuario: User } | null;

function reemplazar(lista: User[], actualizado: User): User[] {
  return lista.map((item) => (item.userId === actualizado.userId ? actualizado : item));
}

export function UsuariosPage() {
  const actual = useCurrentUser();
  const [filtros, setFiltros] = useState<FiltrosUsuarios>(FILTROS_VACIOS);
  const [borrador, setBorrador] = useState<FiltrosUsuarios>(FILTROS_VACIOS);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    listarRoles()
      .then((lista) => {
        if (activo) setRoles(lista);
      })
      .catch((reason: unknown) => {
        if (activo) setError(errorMessage(reason, 'No fue posible consultar los roles.'));
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    listarUsuarios(filtros)
      .then((pagina) => {
        if (!activo) return;
        setUsuarios(pagina.users);
        setSiguiente(pagina.nextCursor);
        setError('');
      })
      .catch((reason: unknown) => {
        if (activo) setError(errorMessage(reason, 'No fue posible consultar los usuarios.'));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [filtros]);

  async function cargarMas(cursor: string) {
    setCargando(true);
    try {
      const pagina = await listarUsuarios(filtros, cursor);
      setUsuarios((previos) => [...previos, ...pagina.users]);
      setSiguiente(pagina.nextCursor);
    } catch (reason) {
      setError(errorMessage(reason, 'No fue posible consultar los usuarios.'));
    } finally {
      setCargando(false);
    }
  }

  function filtrar(nuevos: FiltrosUsuarios) {
    setCargando(true);
    setFiltros(nuevos);
  }

  function aplicar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    filtrar(borrador);
  }

  async function alternarEstado(usuario: User) {
    setCambiando(usuario.userId);
    setAviso('');
    setError('');
    try {
      const guardado = await modificarUsuario(usuario.userId, { isActive: !usuario.isActive });
      setUsuarios((lista) => reemplazar(lista, guardado));
      setAviso(`${guardado.name} fue ${guardado.isActive ? 'activado' : 'desactivado'}.`);
    } catch (reason) {
      setError(errorMessage(reason, 'No fue posible cambiar el estado del usuario.'));
    } finally {
      setCambiando(null);
    }
  }

  function guardado(usuario: User, mensaje: string) {
    setDialogo(null);
    setAviso(mensaje);
    setUsuarios((lista) =>
      lista.some((item) => item.userId === usuario.userId)
        ? reemplazar(lista, usuario)
        : [usuario, ...lista],
    );
  }

  const columnas: Column<User>[] = [
    { key: 'name', header: 'Nombre', render: (u) => u.name },
    { key: 'email', header: 'Correo', render: (u) => u.email },
    {
      key: 'roles',
      header: 'Roles',
      render: (u) => (u.roles.length ? u.roles.map((rol) => rol.name).join(', ') : 'Sin rol'),
    },
    { key: 'school', header: 'Escuela', render: (u) => u.schoolCode ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (u) => (
        <Badge tone={u.isActive ? 'success' : 'neutral'}>
          {u.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (u) => {
        const propio = u.userId === actual.userId;
        return (
          <div className={usuariosStyles.rowActions}>
            <Button
              size="sm"
              variant="secondary"
              aria-label={`Editar ${u.name}`}
              onClick={() => {
                setDialogo({ tipo: 'editar', usuario: u });
              }}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              aria-label={`Roles de ${u.name}`}
              disabled={propio}
              title={propio ? 'Nadie cambia sus propios roles' : undefined}
              onClick={() => {
                setDialogo({ tipo: 'roles', usuario: u });
              }}
            >
              Roles
            </Button>
            <Button
              size="sm"
              variant="quiet"
              aria-label={`${u.isActive ? 'Desactivar' : 'Activar'} a ${u.name}`}
              loading={cambiando === u.userId}
              disabled={propio}
              onClick={() => {
                void alternarEstado(u);
              }}
            >
              {u.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.stack}>
      <title>Usuarios y roles | SIGESDOC</title>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y roles"
        description="Cuentas institucionales, su estado y los roles que determinan sus permisos."
        actions={
          <Button
            onClick={() => {
              setDialogo({ tipo: 'crear' });
            }}
          >
            <UserPlus size={16} aria-hidden="true" /> Nuevo usuario
          </Button>
        }
      />
      {error && <Alert kind="error">{error}</Alert>}
      {aviso && <Alert kind="success">{aviso}</Alert>}
      <Card title="Filtros">
        <form className={usuariosStyles.filtros} onSubmit={aplicar}>
          <TextField
            label="Buscar"
            type="search"
            placeholder="Nombre o correo"
            value={borrador.search}
            onChange={(event) => {
              setBorrador({ ...borrador, search: event.target.value });
            }}
          />
          <Field label="Estado">
            {(control) => (
              <select
                {...control}
                value={borrador.isActive}
                onChange={(event) => {
                  setBorrador({
                    ...borrador,
                    isActive: event.target.value as FiltrosUsuarios['isActive'],
                  });
                }}
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            )}
          </Field>
          <Field label="Rol">
            {(control) => (
              <select
                {...control}
                value={borrador.roleCode}
                onChange={(event) => {
                  setBorrador({ ...borrador, roleCode: event.target.value });
                }}
              >
                <option value="">Todos</option>
                {roles.map((rol) => (
                  <option key={rol.roleId} value={rol.code}>
                    {rol.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className={usuariosStyles.rowActions}>
            <Button type="submit">Aplicar</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setBorrador(FILTROS_VACIOS);
                filtrar(FILTROS_VACIOS);
              }}
            >
              Limpiar
            </Button>
          </div>
        </form>
        {cargando && usuarios.length === 0 ? (
          <p role="status">Consultando usuarios…</p>
        ) : (
          <DataTable
            caption="Usuarios"
            columns={columnas}
            rows={usuarios}
            getRowKey={(u) => u.userId}
            emptyMessage="No hay usuarios que coincidan con los filtros."
            minWidth={820}
          />
        )}
        {siguiente && (
          <div className={usuariosStyles.more}>
            <Button
              variant="secondary"
              loading={cargando}
              onClick={() => {
                void cargarMas(siguiente);
              }}
            >
              Cargar más
            </Button>
          </div>
        )}
      </Card>

      {dialogo?.tipo === 'crear' && (
        <FormularioUsuario
          usuario={null}
          roles={roles}
          onGuardado={(u) => {
            guardado(u, `${u.name} fue creado.`);
          }}
          onCerrar={() => {
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'editar' && (
        <FormularioUsuario
          usuario={dialogo.usuario}
          roles={roles}
          onGuardado={(u) => {
            guardado(u, `Los datos de ${u.name} se actualizaron.`);
          }}
          onCerrar={() => {
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'roles' && (
        <DialogoRoles
          usuario={dialogo.usuario}
          roles={roles}
          onGuardado={(u) => {
            guardado(u, `Los roles de ${u.name} se actualizaron.`);
          }}
          onCerrar={() => {
            setDialogo(null);
          }}
        />
      )}
    </div>
  );
}
