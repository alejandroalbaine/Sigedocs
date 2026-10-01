import { useState, type SyntheticEvent } from 'react';
import type { Role, User } from '../../common/api/contract.ts';
import { ApiError, errorMessage } from '../../common/api/errors.ts';
import { Alert, Button, Dialog, TextField } from '../../common/components/index.ts';
import { crearUsuario, modificarUsuario } from './api.ts';
import {
  erroresDelServidor,
  requiereEscuela,
  validarNuevoUsuario,
  type ErroresUsuario,
} from './reglas.ts';
import styles from './usuarios.module.css';

export interface FormularioUsuarioProps {
  /** `null` = crear; un usuario = editar nombre y escuela. */
  usuario: User | null;
  roles: readonly Role[];
  onGuardado: (usuario: User) => void;
  onCerrar: () => void;
}

/** El padre lo monta solo mientras está abierto, así el estado nace limpio cada vez. */
export function FormularioUsuario({
  usuario,
  roles,
  onGuardado,
  onCerrar,
}: FormularioUsuarioProps) {
  const editando = usuario !== null;
  const [name, setName] = useState(usuario?.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [schoolCode, setSchoolCode] = useState(usuario?.schoolCode ?? '');
  const [errores, setErrores] = useState<ErroresUsuario>({});
  const [fallo, setFallo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const pideEscuela = editando
    ? usuario.roles.some((rol) => requiereEscuela([rol.code]))
    : requiereEscuela(roleCodes);

  async function enviar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setFallo('');
    const datos = { name, email, password, roleCodes, schoolCode };
    const invalidos = editando
      ? {
          ...(name.trim() ? {} : { name: 'Escriba el nombre completo.' }),
          ...(pideEscuela && !schoolCode.trim()
            ? { schoolCode: 'La escuela es obligatoria para Director de Escuela.' }
            : {}),
        }
      : validarNuevoUsuario(datos);
    setErrores(invalidos);
    if (Object.keys(invalidos).length > 0) return;

    setGuardando(true);
    try {
      const guardado = editando
        ? await modificarUsuario(usuario.userId, {
            name: name.trim(),
            ...(schoolCode.trim() ? { schoolCode: schoolCode.trim() } : {}),
          })
        : await crearUsuario({
            name: name.trim(),
            email: email.trim(),
            password,
            roleCodes,
            ...(schoolCode.trim() ? { schoolCode: schoolCode.trim() } : {}),
          });
      onGuardado(guardado);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrores({ email: 'Ya existe un usuario con este correo.' });
      } else {
        if (error instanceof ApiError) setErrores(erroresDelServidor(error.fieldErrors));
        setFallo(errorMessage(error, 'No fue posible guardar el usuario.'));
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open title={editando ? 'Editar usuario' : 'Nuevo usuario'} onClose={onCerrar}>
      <form className={styles.form} onSubmit={(event) => void enviar(event)} noValidate>
        {fallo && <Alert kind="error">{fallo}</Alert>}
        <TextField
          label="Nombre completo"
          value={name}
          error={errores.name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        {!editando && (
          <>
            <TextField
              label="Correo institucional"
              type="email"
              autoComplete="off"
              value={email}
              error={errores.email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
            <TextField
              label="Contraseña inicial"
              type="password"
              autoComplete="new-password"
              value={password}
              error={errores.password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
            <SelectorRoles
              roles={roles}
              seleccionados={roleCodes}
              error={errores.roleCodes}
              onChange={setRoleCodes}
            />
          </>
        )}
        {pideEscuela && (
          <TextField
            label="Código de escuela"
            help="Obligatorio para Director de Escuela, p. ej. ESC-ING."
            value={schoolCode}
            error={errores.schoolCode}
            onChange={(event) => {
              setSchoolCode(event.target.value);
            }}
          />
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardando}>
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SelectorRoles({
  roles,
  seleccionados,
  error,
  onChange,
}: {
  roles: readonly Role[];
  seleccionados: readonly string[];
  error?: string | undefined;
  onChange: (codes: string[]) => void;
}) {
  return (
    <fieldset className={styles.roles}>
      <legend>Roles</legend>
      {roles.map((rol) => (
        <label key={rol.roleId} className={styles.rol}>
          <input
            type="checkbox"
            checked={seleccionados.includes(rol.code)}
            onChange={(event) => {
              onChange(
                event.target.checked
                  ? [...seleccionados, rol.code]
                  : seleccionados.filter((code) => code !== rol.code),
              );
            }}
          />
          {rol.name}
        </label>
      ))}
      {error && <small className={styles.error}>{error}</small>}
    </fieldset>
  );
}
