import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useSession } from '../../common/auth/SessionContext.ts';
import { Button } from '../../common/components/Button/Button.tsx';
import { Dialog } from '../../common/components/Dialog/Dialog.tsx';
import { EstadoServicio } from '../../features/autenticacion/EstadoServicio.tsx';
import { LoginForm } from '../../features/autenticacion/LoginForm/LoginForm.tsx';
import styles from './LoginPage.module.css';

const AYUDA = {
  contrasena: 'Para recuperar su cuenta, comuníquese con la Mesa de Ayuda TI de la UAPA.',
  identidad:
    'La conexión con la identidad única UAPA está preparada para una próxima fase del proyecto.',
  mesa: 'Mesa de Ayuda TI: utilice los canales institucionales autorizados por la UAPA.',
  manual:
    'El manual de usuario se incorporará cuando se habiliten los siguientes módulos del sistema.',
} as const;

function destinoPrevio(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state;
    if (typeof from === 'string' && from.startsWith('/') && from !== '/login') return from;
  }
  return '/';
}

export function LoginPage() {
  const { status, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = destinoPrevio(location.state);
  const [ayuda, setAyuda] = useState<string | null>(null);

  if (status === 'authenticated') return <Navigate to={destino} replace />;

  return (
    <div className={styles.page}>
      <title>Acceso institucional | SIGESDOC</title>
      <a className="skip-link" href="#acceso">
        Saltar al formulario de acceso
      </a>

      <main className={styles.shell}>
        <section className={styles.brand} aria-labelledby="brand-title">
          <div className={styles.lockup}>
            <div className={styles.mark} aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <path
                  d="M11 18.5h17l5 6H53v26H11z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 30h30M17 38h22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle className={styles.markDot} cx="48" cy="45" r="9" />
                <path
                  d="m44 45 3 3 6-7"
                  fill="none"
                  className={styles.markCheck}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className={styles.wordmark}>
                <span>SIGES</span>
                <strong>DOC</strong>
                <small>V1.0</small>
              </p>
              <p className={styles.caption}>Sistema de Gestión Documental Curricular</p>
            </div>
          </div>

          <div className={styles.copy}>
            <p className={styles.institution}>Universidad Abierta para Adultos</p>
            <h1 id="brand-title" className={styles.headline}>
              Documentos íntegros.
              <br />
              Flujos visibles.
              <br />
              Decisiones trazables.
            </h1>
            <p className={styles.intro}>
              Plataforma institucional para organizar, custodiar y consultar los expedientes
              curriculares de la UAPA.
            </p>
          </div>

          <ul className={styles.guarantees} aria-label="Garantías principales del sistema">
            <li>
              <span className={styles.guaranteeIcon} aria-hidden="true">
                ✓
              </span>
              <span>
                <strong>Trazabilidad de acciones</strong>
                <small>Cada acceso queda vinculado al usuario y su rol.</small>
              </span>
            </li>
            <li>
              <span className={styles.guaranteeIcon} aria-hidden="true">
                ⌁
              </span>
              <span>
                <strong>Versiones protegidas</strong>
                <small>El historial documental se conserva sin sobrescrituras.</small>
              </span>
            </li>
            <li>
              <span className={styles.guaranteeIcon} aria-hidden="true">
                ◇
              </span>
              <span>
                <strong>Permisos por perfil</strong>
                <small>Las funciones disponibles responden a cada responsabilidad.</small>
              </span>
            </li>
          </ul>

          <footer className={styles.footer}>
            <span>Vicerrectoría Académica</span>
            <span>República Dominicana</span>
          </footer>
        </section>

        <section id="acceso" className={styles.access} aria-labelledby="access-title">
          <div className={styles.wrap}>
            <div className={styles.card}>
              <div className={styles.lock} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Zm6 4v2" />
                </svg>
              </div>
              <header className={styles.heading}>
                <p className={styles.eyebrow}>Portal seguro UAPA</p>
                <h2 id="access-title" className={styles.title}>
                  Acceso institucional
                </h2>
                <p className={styles.subtitle}>Ingrese sus credenciales autorizadas.</p>
              </header>
              <div className={styles.service}>
                <EstadoServicio />
              </div>

              <LoginForm
                onSuccess={(user) => {
                  signIn(user);
                  void navigate(destino, { replace: true });
                }}
                onForgotPassword={() => {
                  setAyuda(AYUDA.contrasena);
                }}
              />

              <div className={styles.separator}>
                <span>o</span>
              </div>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setAyuda(AYUDA.identidad);
                }}
              >
                Continuar con identidad UAPA
              </Button>

              <p className={styles.audit}>
                <span aria-hidden="true">◉</span> El acceso y las acciones quedan registrados.
              </p>
            </div>

            <nav className={styles.help} aria-label="Ayuda para el acceso">
              <p>¿Problemas de acceso con su cuenta institucional?</p>
              <div>
                <Button
                  variant="text"
                  onClick={() => {
                    setAyuda(AYUDA.mesa);
                  }}
                >
                  Mesa de Ayuda TI
                </Button>
                <span aria-hidden="true">•</span>
                <Button
                  variant="text"
                  onClick={() => {
                    setAyuda(AYUDA.manual);
                  }}
                >
                  Manual de usuario
                </Button>
              </div>
            </nav>
          </div>
        </section>
      </main>

      <Dialog
        open={ayuda !== null}
        title="Información de acceso"
        onClose={() => {
          setAyuda(null);
        }}
      >
        <p className={styles.dialogText}>{ayuda}</p>
        <Button
          fullWidth
          onClick={() => {
            setAyuda(null);
          }}
        >
          Entendido
        </Button>
      </Dialog>
    </div>
  );
}
