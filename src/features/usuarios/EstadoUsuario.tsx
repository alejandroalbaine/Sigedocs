import { useState } from 'react';
import type { ManagedUser } from '../../common/api/userContract.ts';
import { usersApi } from '../../common/api/users.ts';
import { Alert, Button, Dialog } from '../../common/components/index.ts';
import { erroresDelServidor } from './reglas.ts';
import styles from './usuarios.module.css';

export interface EstadoUsuarioProps {
  usuario: ManagedUser;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}

/** Activa o desactiva con `PATCH /users/{id}` `{ isActive }`; desactivar revoca sus sesiones. */
export function EstadoUsuario({ usuario, onCerrar, onGuardado }: EstadoUsuarioProps) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const desactivar = usuario.isActive;

  async function confirmar() {
    setEnviando(true);
    setError('');
    try {
      const { data } = await usersApi.update(usuario.userId, { isActive: !desactivar });
      onGuardado(`${data.name} quedó ${data.isActive ? 'activo' : 'inactivo'}.`);
    } catch (reason) {
      setError(erroresDelServidor(reason, 'No fue posible cambiar el estado.').mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open
      title={`${desactivar ? 'Desactivar' : 'Activar'} a ${usuario.name}`}
      onClose={onCerrar}
    >
      <div className={styles.form}>
        <p className={styles.readonly}>
          {desactivar
            ? 'La cuenta no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial se conserva.'
            : 'La cuenta podrá volver a iniciar sesión con sus roles actuales.'}
        </p>
        {error && <Alert kind="error">{error}</Alert>}
        <div className={styles.actions}>
          <Button variant="quiet" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant={desactivar ? 'danger' : 'primary'}
            loading={enviando}
            onClick={() => void confirmar()}
          >
            {desactivar ? 'Desactivar cuenta' : 'Activar cuenta'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
