import { useState } from 'react';
import type { Role, User } from '../../common/api/contract.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { Alert, Button, Dialog } from '../../common/components/index.ts';
import { reemplazarRoles } from './api.ts';
import { SelectorRoles } from './FormularioUsuario.tsx';
import styles from './usuarios.module.css';

export interface DialogoRolesProps {
  usuario: User;
  roles: readonly Role[];
  onGuardado: (usuario: User) => void;
  onCerrar: () => void;
}

/** `PUT /users/{id}/roles` reemplaza todos los roles; por eso no se permite dejarlos vacíos. */
export function DialogoRoles({ usuario, roles, onGuardado, onCerrar }: DialogoRolesProps) {
  const [codes, setCodes] = useState(usuario.roles.map((rol) => rol.code));
  const [fallo, setFallo] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setFallo('');
    setGuardando(true);
    try {
      onGuardado(await reemplazarRoles(usuario.userId, codes));
    } catch (error) {
      setFallo(errorMessage(error, 'No fue posible asignar los roles.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open title={`Roles de ${usuario.name}`} onClose={onCerrar}>
      <div className={styles.form}>
        {fallo && <Alert kind="error">{fallo}</Alert>}
        <SelectorRoles roles={roles} seleccionados={codes} onChange={setCodes} />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            loading={guardando}
            disabled={codes.length === 0}
            onClick={() => {
              void guardar();
            }}
          >
            Guardar roles
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
