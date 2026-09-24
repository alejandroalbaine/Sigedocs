import { createApiClient, type ApiClient } from '../common/api/client.ts';

/**
 * Respuestas con la forma exacta que produce SIGESDOC_BACKEND:
 * - login: autenticacion.routes.ts → { sessionState, expiresAt, user } (sin `unit`)
 * - users/current: usuario.mapper.ts → { user } con `unit: null`
 * - roles: rol.mapper.ts → [{ rolId, codigo, nombre }] con `meta`
 * - errores: errorHandler.ts → Problem Details con `codigo` y `errores`
 * Si el backend cambia su contrato, estas fixtures deben cambiar primero.
 */
export const especialista = {
  userId: '10000000-0000-4000-8000-000000000013',
  name: 'Especialista Curricular',
  email: 'especialista.curricular@uapa.edu.do',
  roles: ['ESPECIALISTA_CURRICULAR'],
  permissions: ['expedientes.editar', 'expedientes.consultar', 'expedientes.aprobar'],
};

export const adminSistema = {
  userId: '10000000-0000-4000-8000-000000000011',
  name: 'Admin del Sistema',
  email: 'admin.sistema@uapa.edu.do',
  roles: ['ADMIN_SISTEMA'],
  permissions: ['usuarios.administrar', 'auditoria.consultar'],
};

export const sinPermisos = {
  userId: '10000000-0000-4000-8000-000000000099',
  name: 'Usuario Consulta',
  email: 'consulta@uapa.edu.do',
  roles: ['VRA'],
  permissions: [],
};

export type BackendUser = typeof especialista;

export function json(body: unknown, status = 200, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } });
}

export function problem(status: number, codigo: string, errores?: unknown[]): Response {
  return json(
    {
      type: `/problemas/${codigo.toLowerCase()}`,
      title: 'Título del servidor',
      status,
      detail: 'Detalle interno del servidor',
      instance: '/api/v1/prueba',
      codigo,
      ...(errores ? { errores } : {}),
    },
    status,
    'application/problem+json',
  );
}

export const responses = {
  status: () => json({ data: { status: 'available' } }),
  login: (user: BackendUser) =>
    json({
      data: { sessionState: 'active', expiresAt: '2026-09-24T06:00:00.000Z', user },
    }),
  currentUser: (user: BackendUser) => json({ data: { user: { ...user, unit: null } } }),
  roles: () =>
    json({
      data: [
        { rolId: 'r1', codigo: 'ADMIN_SISTEMA', nombre: 'Administrador del sistema' },
        { rolId: 'r2', codigo: 'ESPECIALISTA_CURRICULAR', nombre: 'Especialista curricular' },
        { rolId: 'r3', codigo: 'VRA', nombre: 'Vicerrectoría Académica' },
      ],
      meta: { cantidadDevuelta: 3, orden: ['nombre:asc', 'rolId:asc'] },
    }),
  noSession: () => problem(401, 'SESION_AUSENTE'),
  logout: () => new Response(null, { status: 204 }),
};

type Handler = (init: RequestInit) => Response | Promise<Response>;

export interface FakeBackend {
  client: ApiClient;
  calls: string[];
  on: (route: string, handler: Handler) => void;
}

/**
 * Backend en memoria: responde por "MÉTODO /ruta". Sin sesión por defecto,
 * `/roles` y `/status` disponibles; lo no registrado responde 404.
 */
export function fakeBackend(routes: Record<string, Handler> = {}): FakeBackend {
  const handlers = new Map<string, Handler>([
    ['GET /api/v1/status', responses.status],
    ['GET /api/v1/roles', responses.roles],
    ['GET /api/v1/users/current', responses.noSession],
    ...Object.entries(routes),
  ]);
  const calls: string[] = [];
  const client = createApiClient({
    baseUrl: '',
    fetchImpl: async (url, init) => {
      const key = `${init.method ?? 'GET'} ${url}`;
      calls.push(key);
      const handler = handlers.get(key);
      return handler ? handler(init) : problem(404, 'RECURSO_NO_ENCONTRADO');
    },
  });
  return {
    client,
    calls,
    on: (route, handler) => {
      handlers.set(route, handler);
    },
  };
}

/** Backend con una sesión activa para `user`. */
export function signedInBackend(user: BackendUser): FakeBackend {
  return fakeBackend({
    'GET /api/v1/users/current': () => responses.currentUser(user),
    'DELETE /api/v1/sessions/current': responses.logout,
  });
}
