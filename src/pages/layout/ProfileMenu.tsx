import { useEffect, useId, useRef, useState } from 'react';
import type { SessionUser } from '../../common/api/contract.ts';
import { Button } from '../../common/components/Button/Button.tsx';
import { initials } from '../../common/utils/initials.ts';
import styles from './ProfileMenu.module.css';

export interface ProfileMenuProps {
  user: SessionUser;
  /** Nombres de rol ya resueltos. */
  roles: string;
  onLogout: () => void;
}

export function ProfileMenu({ user, roles, onLogout }: ProfileMenuProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!abierto) return;
    function alHacerClic(event: MouseEvent) {
      if (!contenedor.current?.contains(event.target as Node)) setAbierto(false);
    }
    function alPulsarTecla(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    }
    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className={styles.profile}>
      <button
        ref={boton}
        type="button"
        className={styles.trigger}
        aria-expanded={abierto}
        aria-controls={menuId}
        onClick={() => {
          setAbierto((valor) => !valor);
        }}
      >
        <span className={styles.who}>
          <strong>{user.name}</strong>
          <small>{roles || 'Usuario institucional'}</small>
        </span>
        <span className={styles.chevron} aria-hidden="true">
          ⌄
        </span>
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="visually-hidden">Perfil y sesión</span>
      </button>

      <div id={menuId} className={styles.menu} hidden={!abierto}>
        <dl className={styles.data}>
          <dt>Nombre</dt>
          <dd>{user.name}</dd>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
          <dt>Rol</dt>
          <dd>{roles || 'Sin rol asignado'}</dd>
          {user.unit && (
            <>
              <dt>Unidad</dt>
              <dd>{user.unit}</dd>
            </>
          )}
        </dl>
        <Button variant="quiet" size="sm" fullWidth onClick={onLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
