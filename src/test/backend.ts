import { vi } from 'vitest';
import { createApiClient, type ApiClient } from '../common/api/client.ts';
import type { ManagedUser } from '../common/api/userContract.ts';
import type { Dossier } from '../pages/documental/types.ts';

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

/** Cuenta con permisos de consulta y auditoría (como admin.integral en la siembra local). */
export const adminIntegral = {
  userId: '10000000-0000-4000-8000-000000000001',
  name: 'Administrador inicial',
  email: 'admin.integral@uapa.edu.do',
  roles: ['ADMIN_SISTEMA', 'DIR_GESTION_CURRICULAR'],
  permissions: [
    'auditoria.consultar',
    'usuarios.administrar',
    'expedientes.aprobar',
    'expedientes.consultar',
    'plantillas.administrar',
  ],
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

/** Expediente con la forma exacta del contrato `Dossier` (endpoints.md §4). */
export function dossier(overrides: Partial<Dossier> = {}): Dossier {
  return {
    dossierId: '20000000-0000-4000-8000-000000000001',
    code: 'ECD-2026-0001',
    title: 'Ingeniería de Software I',
    documentType: 'course_program',
    academicLevel: 'bachelor',
    schoolCode: 'ESC-ING',
    degreeProgramCode: 'ISW',
    subjectCode: 'ISW-201',
    workflowId: '30000000-0000-4000-8000-000000000001',
    currentState: { code: 'RECEIVED', name: 'Recepcionado', isEditable: true },
    currentVersion: { versionId: '40000000-0000-4000-8000-000000000001', label: 'v1.0' },
    template: {
      templateId: '50000000-0000-4000-8000-000000000001',
      templateVersionId: '60000000-0000-4000-8000-000000000001',
    },
    assignedSpecialist: null,
    createdBy: { userId: '10000000-0000-4000-8000-000000000019', name: 'Coordinador de Programa' },
    createdAt: '2026-09-20T14:00:00.000Z',
    ...overrides,
  };
}

/**
 * Las páginas documentales usan `fetch` global (domainClient). `stubApi` responde por
 * "MÉTODO /ruta" (sin query); un valor se envía como `{ data }` y una función puede devolver
 * una `Response`. Lo no registrado responde 404, como una ruta del contrato aún no implementada.
 * Devuelve las llamadas recibidas para verificar cuerpos y parámetros.
 */
export function stubApi(rutas: Record<string, unknown>) {
  const llamadas: { key: string; url: URL; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string, init: RequestInit = {}) => {
      const url = new URL(input, 'http://localhost');
      const key = `${init.method ?? 'GET'} ${url.pathname}`;
      const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
      llamadas.push({ key, url, body });
      if (!(key in rutas)) return Promise.resolve(problem(404, 'NOT_FOUND'));
      const ruta = rutas[key];
      const valor =
        typeof ruta === 'function'
          ? (ruta as (i: RequestInit, u: URL) => unknown)(init, url)
          : ruta;
      if (valor instanceof Response) return Promise.resolve(valor);
      return Promise.resolve(
        json({
          data: valor,
          meta: {
            pagination: {
              next: null,
              previous: null,
              hasMore: false,
              limit: 25,
              returnedCount: Array.isArray(valor) ? valor.length : 1,
            },
          },
        }),
      );
    }),
  );
  return llamadas;
}

/** Atajo: solo `GET /api/v1/dossiers` con los expedientes dados. */
export function stubDossiers(items: Dossier[]) {
  return stubApi({ 'GET /api/v1/dossiers': items });
}

/** Usuario administrado con la forma exacta del contrato `User` (endpoints.md §2). */
export function usuarioGestionado(overrides: Partial<ManagedUser> = {}): ManagedUser {
  return {
    userId: '10000000-0000-4000-8000-000000000019',
    name: 'Coordinador de Programa',
    email: 'coord.programa@uapa.edu.do',
    isActive: true,
    schoolCode: null,
    roles: [{ roleId: 'r9', code: 'PROGRAM_COORDINATOR', name: 'Coordinador de Programa' }],
    createdAt: '2026-09-25T14:00:00.000Z',
    ...overrides,
  };
}
