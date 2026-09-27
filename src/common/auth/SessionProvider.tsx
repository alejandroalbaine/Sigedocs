import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApi } from '../api/ApiContext.ts';
import type { ApiClient } from '../api/client.ts';
import type { SessionUser } from '../api/contract.ts';
import { ApiError, isSessionError } from '../api/errors.ts';
import { SessionContext, type SessionStatus, type SessionValue } from './SessionContext.ts';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  error: ApiError | null;
}

const LOADING: SessionState = { status: 'loading', user: null, error: null };
const ANONYMOUS: SessionState = { status: 'anonymous', user: null, error: null };

/** Consulta `users/current` y traduce el resultado a un estado de sesión. Nunca lanza. */
async function fetchSession(client: ApiClient): Promise<SessionState> {
  try {
    const { user } = await client.request('currentUser');
    return { status: 'authenticated', user, error: null };
  } catch (caught) {
    if (isSessionError(caught)) return ANONYMOUS;
    const error =
      caught instanceof ApiError ? caught : new ApiError('No se pudo verificar la sesión.');
    return { status: 'error', user: null, error };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useApi();
  const [session, setSession] = useState<SessionState>(LOADING);
  const [roleNames, setRoleNames] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    let active = true;
    void fetchSession(client).then((next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => {
    function sessionExpired() {
      setSession(ANONYMOUS);
      setRoleNames(new Map());
    }
    window.addEventListener('sigesdoc:session-expired', sessionExpired);
    return () => {
      window.removeEventListener('sigesdoc:session-expired', sessionExpired);
    };
  }, []);

  const authenticated = session.status === 'authenticated';
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    client
      .request('roles')
      .then((roles) => {
        if (active) setRoleNames(new Map(roles.map((role) => [role.code, role.name])));
      })
      .catch(() => {
        // Sin nombres se muestran los códigos: no bloquea el uso de la aplicación.
      });
    return () => {
      active = false;
    };
  }, [authenticated, client]);

  const refresh = useCallback(async () => {
    setSession(LOADING);
    setSession(await fetchSession(client));
  }, [client]);

  const signIn = useCallback((user: SessionUser) => {
    setSession({ status: 'authenticated', user, error: null });
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.request('logout');
    } catch (caught) {
      if (!isSessionError(caught)) throw caught;
    }
    setSession(ANONYMOUS);
  }, [client]);

  const value = useMemo<SessionValue>(
    () => ({ ...session, roleNames, signIn, refresh, logout }),
    [session, roleNames, signIn, refresh, logout],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
