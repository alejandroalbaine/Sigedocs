import { createContext, useContext } from 'react';
import type { SessionUser } from '../api/contract.ts';
import type { ApiError } from '../api/errors.ts';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface SessionValue {
  status: SessionStatus;
  user: SessionUser | null;
  /** Fallo al verificar la sesión que no es un 401 (backend caído, respuesta inválida). */
  error: ApiError | null;
  /** Nombre legible de cada código de rol; vacío si `/roles` no respondió. */
  roleNames: ReadonlyMap<string, string>;
  /** Estado de `GET /roles`: mientras carga no debe mostrarse como fallo. */
  rolesStatus: 'loading' | 'ready' | 'error';
  /** Registra la identidad devuelta por el login, sin otra solicitud. */
  signIn: (user: SessionUser) => void;
  /** Vuelve a consultar `users/current`. */
  refresh: () => Promise<void>;
  /** Cierra la sesión en el servidor. Si falla por otra causa que 401, lanza el error. */
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  return value;
}

/** Usuario de una pantalla protegida: RequireSession garantiza que existe. */
export function useCurrentUser(): SessionUser {
  const { user } = useSession();
  if (!user) throw new Error('useCurrentUser requiere una sesión autenticada.');
  return user;
}

export function roleLabels(user: SessionUser, roleNames: ReadonlyMap<string, string>): string {
  return user.roles.map((code) => roleNames.get(code) ?? code).join(', ');
}
