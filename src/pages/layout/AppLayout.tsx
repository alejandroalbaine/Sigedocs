import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { errorMessage } from '../../common/api/errors.ts';
import { roleLabels, useCurrentUser, useSession } from '../../common/auth/SessionContext.ts';
import { Alert } from '../../common/components/Alert/Alert.tsx';
import styles from './AppLayout.module.css';
import { visibleNavigation } from './navigation.ts';
import { ProfileMenu } from './ProfileMenu.tsx';

/** Estructura común de las pantallas internas: navegación por permisos, perfil y contenido. */
export function AppLayout() {
  const user = useCurrentUser();
  const { roleNames, logout } = useSession();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [errorCierre, setErrorCierre] = useState('');
  const items = visibleNavigation(user.permissions);

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  async function cerrarSesion() {
    setErrorCierre('');
    try {
      // Al quedar anónima, RequireSession devuelve al acceso.
      await logout();
    } catch (error) {
      setErrorCierre(
        `${errorMessage(error, 'No se pudo cerrar la sesión.')} La sesión sigue abierta; inténtelo de nuevo.`,
      );
    }
  }

  return (
    <div className={styles.app}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <aside
        id="menu-principal"
        className={[styles.sidebar, menuAbierto ? styles.sidebarOpen : ''].join(' ')}
        aria-label="Menú principal"
      >
        <Link to="/" className={styles.brand} onClick={cerrarMenu}>
          <span className={styles.brandName}>
            SIGES<strong>DOC</strong>
          </span>
          <span className={styles.brandCaption}>Sistema de Gestión Documental Curricular</span>
        </Link>

        <nav aria-labelledby="nav-label">
          <p id="nav-label" className={styles.navLabel}>
            Módulos
          </p>
          <ul className={styles.nav}>
            {items.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink to={item.to} end className={styles.navItem ?? ''} onClick={cerrarMenu}>
                    <span className={styles.navIcon} aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                ) : (
                  <span className={`${styles.navItem} ${styles.pending}`}>
                    <span className={styles.navIcon} aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                    <span className={styles.pendingTag}>Pronto</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {menuAbierto && (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Cerrar menú"
          onClick={cerrarMenu}
        />
      )}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="menu-principal"
            onClick={() => {
              setMenuAbierto((abierto) => !abierto);
            }}
          >
            ☰
          </button>
          <span className={styles.topbarTitle}>Universidad Abierta para Adultos</span>
          <ProfileMenu
            user={user}
            roles={roleLabels(user, roleNames)}
            onLogout={() => void cerrarSesion()}
          />
        </header>

        <main id="contenido" className={styles.content} tabIndex={-1}>
          {errorCierre && <Alert kind="error">{errorCierre}</Alert>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
