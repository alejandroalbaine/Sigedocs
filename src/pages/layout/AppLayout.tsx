import { useState, type SyntheticEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Bell, Building2, CircleHelp, Menu, Search, X } from 'lucide-react';
import { errorMessage } from '../../common/api/errors.ts';
import { roleLabels, useCurrentUser, useSession } from '../../common/auth/SessionContext.ts';
import { Alert } from '../../common/components/Alert/Alert.tsx';
import styles from './AppLayout.module.css';
import { visibleNavigation } from './navigation.ts';
import { ProfileMenu } from './ProfileMenu.tsx';

/** Estructura común de las pantallas internas: navegación por permisos, perfil y contenido. */
export function AppLayout() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { roleNames, logout } = useSession();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [errorCierre, setErrorCierre] = useState('');
  const [busqueda, setBusqueda] = useState('');
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

  function buscar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const termino = busqueda.trim();
    void navigate(termino ? `/busqueda?q=${encodeURIComponent(termino)}` : '/busqueda');
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
          <span className={styles.brandLogo}>
            <img src="/LogoSIGESDOC.png" alt="" />
          </span>
          <span>
            <span className={styles.brandName}>SIGESDOC</span>
            <span className={styles.brandCaption}>
              UAPA · ARCHIVO
              <br />
              CURRICULAR
            </span>
          </span>
        </Link>

        <nav aria-labelledby="nav-label">
          <p id="nav-label" className={styles.navLabel}>
            Navegación institucional
          </p>
          <ul className={styles.nav}>
            {items.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink to={item.to} end className={styles.navItem ?? ''} onClick={cerrarMenu}>
                    <item.icon
                      className={styles.navIcon}
                      size={17}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    {item.label}
                  </NavLink>
                ) : (
                  <span className={`${styles.navItem} ${styles.pending}`}>
                    <item.icon
                      className={styles.navIcon}
                      size={17}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    {item.label}
                    <span className={styles.pendingTag}>Pronto</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <footer className={styles.sidebarFooter}>
          <div className={styles.legalCard}>
            <span>Marco jurídico</span>
            <strong>Normativa Ley 481-08</strong>
            <small>Versión v2.4.0 (AGN / UAPA)</small>
          </div>
          <button
            type="button"
            className={styles.supportButton}
            disabled
            title="Canal pendiente de integración"
          >
            <CircleHelp size={15} aria-hidden="true" /> Soporte UAPA
          </button>
        </footer>
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
            {menuAbierto ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
          <div className={styles.productPath}>
            <Building2 size={16} aria-hidden="true" />
            <span>SIGESDOC</span>
            <span className={styles.pathSeparator}>/</span>
            <strong>Sistema de Gestión Documental Institucional</strong>
          </div>
          <form className={styles.globalSearch} role="search" onSubmit={buscar}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar por código, serie o descriptor"
              placeholder="Buscar por código, serie o descriptor..."
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value);
              }}
            />
          </form>
          <button
            type="button"
            className={styles.notifications}
            aria-label="Notificaciones"
            disabled
            title="Las notificaciones estarán disponibles cuando backend publique la ruta"
          >
            <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
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
