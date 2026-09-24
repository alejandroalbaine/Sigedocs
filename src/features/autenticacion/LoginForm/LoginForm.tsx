import { useRef, useState, type SubmitEvent } from 'react';
import { useApi } from '../../../common/api/ApiContext.ts';
import type { SessionUser } from '../../../common/api/contract.ts';
import { ApiError, errorMessage } from '../../../common/api/errors.ts';
import { Alert } from '../../../common/components/Alert/Alert.tsx';
import { Button } from '../../../common/components/Button/Button.tsx';
import { TextField } from '../../../common/components/TextField/TextField.tsx';
import { validarCredenciales, type CampoLogin, type ErroresLogin } from '../validacion.ts';
import { CuentasDePrueba } from './CuentasDePrueba.tsx';
import styles from './LoginForm.module.css';

export interface LoginFormProps {
  onSuccess: (user: SessionUser) => void;
  onForgotPassword: () => void;
}

function esCampoLogin(field: string): field is CampoLogin {
  return field === 'email' || field === 'password';
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const client = useApi();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  /** Mensajes de la validación local, junto a cada campo. */
  const [errores, setErrores] = useState<ErroresLogin>({});
  /** Campos que el backend rechazó; su mensaje va en la alerta general. */
  const [rechazados, setRechazados] = useState<CampoLogin[]>([]);
  const [alerta, setAlerta] = useState('');
  const [enviando, setEnviando] = useState(false);

  function limpiar() {
    setErrores({});
    setRechazados([]);
    setAlerta('');
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    limpiar();

    const locales = validarCredenciales(email, password);
    if (locales.email ?? locales.password) {
      setErrores(locales);
      setAlerta('Revise el correo institucional y la contraseña.');
      (locales.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setEnviando(true);
    try {
      const { user } = await client.request('login', { email: email.trim(), password, remember });
      onSuccess(user);
    } catch (error) {
      setAlerta(errorMessage(error, 'No se pudo iniciar sesión. Inténtelo de nuevo.'));
      const campos =
        error instanceof ApiError
          ? error.fieldErrors.map(({ field }) => field).filter(esCampoLogin)
          : [];
      setRechazados(campos);
      if (campos[0] === 'email') {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
        passwordRef.current?.select();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      {import.meta.env.DEV && (
        <CuentasDePrueba
          onSelect={(correo) => {
            setEmail(correo);
            limpiar();
            passwordRef.current?.focus();
          }}
        />
      )}

      {alerta && <Alert kind="error">{alerta}</Alert>}

      <TextField
        ref={emailRef}
        label="Correo institucional"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        icon="@"
        help="Utilice su cuenta institucional @uapa.edu.do."
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
        error={errores.email}
        invalid={rechazados.includes('email')}
        required
      />

      <TextField
        ref={passwordRef}
        label="Contraseña"
        name="password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        icon="▣"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
        error={errores.password}
        invalid={rechazados.includes('password')}
        required
        action={
          <button
            type="button"
            className={styles.toggle}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            onClick={() => {
              setShowPassword((visible) => !visible);
              passwordRef.current?.focus();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </svg>
          </button>
        }
      />

      <div className={styles.options}>
        <label className={styles.check}>
          <input
            type="checkbox"
            name="remember"
            checked={remember}
            onChange={(event) => {
              setRemember(event.target.checked);
            }}
          />
          <span>Recordar esta sesión</span>
        </label>
        <Button variant="text" onClick={onForgotPassword}>
          ¿Olvidó su contraseña?
        </Button>
      </div>

      <Button type="submit" fullWidth loading={enviando}>
        <span>{enviando ? 'Verificando credenciales…' : 'Iniciar sesión segura'}</span>
        {!enviando && (
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        )}
      </Button>
    </form>
  );
}
