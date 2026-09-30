import { useState } from 'react';
import type { ManagedUser } from '../../common/api/userContract.ts';
import { usersApi } from '../../common/api/users.ts';
import { Alert, Button, Dialog } from '../../common/components/index.ts';
import { codigoContrato, erroresDelServidor, requiereEscuela, type OpcionRol } from './reglas.ts';
import { SeleccionRoles } from './SeleccionRoles.tsx';
import styles from './usuarios.module.css';

export interface RolesUsuarioProps {
  usuario: ManagedUser;
  opciones: readonly OpcionRol[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}

/** `PUT /users/{id}/roles` reemplaza la lista completa; no se envían altas o bajas sueltas. */
export function RolesUsuario({ usuario, opciones, onCerrar, onGuardado }: RolesUsuarioProps) {
  const [seleccion, setSeleccion] = useState<string[]>(() => usuario.roles.map((rol) => rol.code));
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    if (seleccion.length === 0) {
      setError('Asigne al menos un rol. Para retirar el acceso, desactive la cuenta.');
      return;
    }
    if (requiereEscuela(seleccion) && !usuario.schoolCode) {
      setError(
        'Registre primero el código de escuela con «Editar»: el Director de Escuela lo exige.',
      );
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const { data } = await usersApi.setRoles(usuario.userId, seleccion.map(codigoContrato));
      onGuardado(`Roles de ${data.name} actualizados.`);
    } catch (reason) {
      setError(erroresDelServidor(reason, 'No fue posible actualizar los roles.').mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open title={`Roles de ${usuario.name}`} onClose={onCerrar}>
      <div className={styles.form}>
        <p className={styles.readonly}>
          La selección reemplaza todos los roles actuales. Los permisos cambian en la siguiente
          solicitud del usuario.
        </p>
        <SeleccionRoles opciones={opciones} seleccion={seleccion} onCambiar={setSeleccion} />
        {error && <Alert kind="error">{error}</Alert>}
        <div className={styles.actions}>
          <Button variant="quiet" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button loading={enviando} onClick={() => void guardar()}>
            Guardar roles
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
