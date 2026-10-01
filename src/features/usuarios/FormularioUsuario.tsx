import { useState, type SyntheticEvent } from 'react';
import type { ManagedUser, UpdateUserInput } from '../../common/api/userContract.ts';
import { usersApi } from '../../common/api/users.ts';
import { Alert, Button, Dialog, TextField } from '../../common/components/index.ts';
import {
  codigoContrato,
  datosDe,
  erroresDelServidor,
  requiereEscuela,
  USUARIO_VACIO,
  validarUsuario,
  type DatosUsuario,
  type ErroresUsuario,
  type OpcionRol,
} from './reglas.ts';
import { SeleccionRoles } from './SeleccionRoles.tsx';
import styles from './usuarios.module.css';

export interface FormularioUsuarioProps {
  /** `null` crea un usuario; con valor, edita nombre y escuela. */
  usuario: ManagedUser | null;
  opciones: readonly OpcionRol[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}

/** Solo lo que cambió: el contrato de `PATCH /users/{id}` admite name, isActive y schoolCode. */
function cambios(original: ManagedUser, datos: DatosUsuario): UpdateUserInput {
  const salida: UpdateUserInput = {};
  const nombre = datos.name.trim();
  if (nombre !== original.name) salida.name = nombre;
  const escuela = datos.schoolCode.trim() || null;
  if (escuela !== original.schoolCode) salida.schoolCode = escuela;
  return salida;
}

export function FormularioUsuario({
  usuario,
  opciones,
  onCerrar,
  onGuardado,
}: FormularioUsuarioProps) {
  const creando = usuario === null;
  const [datos, setDatos] = useState<DatosUsuario>(usuario ? datosDe(usuario) : USUARIO_VACIO);
  const [errores, setErrores] = useState<ErroresUsuario>({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  function cambiar<K extends keyof DatosUsuario>(campo: K, valor: DatosUsuario[K]) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
  }

  async function guardar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const locales = validarUsuario(datos, creando);
    setErrores(locales);
    setMensaje('');
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    try {
      if (creando) {
        const escuela = datos.schoolCode.trim();
        const { data } = await usersApi.create({
          name: datos.name.trim(),
          email: datos.email.trim().toLowerCase(),
          password: datos.password,
          roleCodes: datos.roleCodes.map(codigoContrato),
          ...(escuela ? { schoolCode: escuela } : {}),
        });
        onGuardado(`Usuario ${data.name} creado.`);
      } else {
        const pendientes = cambios(usuario, datos);
        if (Object.keys(pendientes).length === 0) {
          onGuardado('No había cambios que guardar.');
          return;
        }
        const { data } = await usersApi.update(usuario.userId, pendientes);
        onGuardado(`Datos de ${data.name} actualizados.`);
      }
    } catch (reason) {
      const servidor = erroresDelServidor(reason, 'No fue posible guardar el usuario.');
      setMensaje(servidor.mensaje);
      setErrores(servidor.campos);
    } finally {
      setEnviando(false);
    }
  }

  const escuelaObligatoria = requiereEscuela(datos.roleCodes);

  return (
    <Dialog open title={creando ? 'Nuevo usuario' : `Editar a ${usuario.name}`} onClose={onCerrar}>
      <form className={styles.form} noValidate onSubmit={(event) => void guardar(event)}>
        <TextField
          label="Nombre completo"
          value={datos.name}
          autoComplete="off"
          error={errores.name}
          onChange={(event) => {
            cambiar('name', event.target.value);
          }}
        />
        {creando ? (
          <>
            <TextField
              label="Correo institucional"
              type="email"
              value={datos.email}
              autoComplete="off"
              placeholder="nombre@uapa.edu.do"
              error={errores.email}
              onChange={(event) => {
                cambiar('email', event.target.value);
              }}
            />
            <TextField
              label="Contraseña inicial"
              type="password"
              value={datos.password}
              autoComplete="new-password"
              help="Entre 8 y 128 caracteres. Compártala por un canal seguro."
              error={errores.password}
              onChange={(event) => {
                cambiar('password', event.target.value);
              }}
            />
            <SeleccionRoles
              opciones={opciones}
              seleccion={datos.roleCodes}
              error={errores.roleCodes}
              onCambiar={(codigos) => {
                cambiar('roleCodes', codigos);
              }}
            />
          </>
        ) : (
          <p className={styles.readonly}>
            Correo: {usuario.email}. Los roles se cambian con la acción «Roles».
          </p>
        )}
        <TextField
          label={escuelaObligatoria ? 'Código de escuela (obligatorio)' : 'Código de escuela'}
          value={datos.schoolCode}
          autoComplete="off"
          placeholder="ESC-ING"
          help="Obligatorio para el Director de Escuela."
          error={errores.schoolCode}
          onChange={(event) => {
            cambiar('schoolCode', event.target.value);
          }}
        />
        {mensaje && <Alert kind="error">{mensaje}</Alert>}
        <div className={styles.actions}>
          <Button variant="quiet" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando}>
            {creando ? 'Crear usuario' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
