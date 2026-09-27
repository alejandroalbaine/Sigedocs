/**
 * Contrato de la API de SIGESDOC_BACKEND tal como lo publica (ADR-005, ADR-009).
 * La fuente es el backend: estos tipos y sus validadores lo reflejan, no lo definen.
 * El contrato final usa inglés camelCase (`code`, `errors`, `meta.pagination`). Mientras REF-02
 * termina en backend, los validadores aceptan también los alias anteriores documentados.
 */

/** Identidad pública del usuario autenticado. `permissions` son códigos `modulo.accion`. */
export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  /** Opcional hasta que el backend modele la unidad institucional. */
  unit: string | null;
  /** Códigos de rol, p. ej. `ESPECIALISTA_CURRICULAR`. El nombre se obtiene de `/roles`. */
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  remember: boolean;
}

/** `POST /api/v1/sessions`. El `user` del login no incluye `unit`. */
export interface LoginResponse {
  sessionState: string;
  expiresAt: string;
  user: SessionUser;
}

/** `GET /api/v1/users/current`. */
export interface CurrentUserResponse {
  user: SessionUser;
}

/** `GET /api/v1/status`: 200 con `available`, o 503 `SERVICIO_NO_DISPONIBLE`. */
export interface StatusResponse {
  status: string;
}

/** `GET /api/v1/roles`. Los alias antiguos se aceptan mientras termina REF-02. */
export interface Role {
  roleId: string;
  code: string;
  name: string;
}

/** Error de campo dentro de un Problem Details `VALIDATION_FAILED`. */
export interface FieldError {
  field: string;
  code: string;
}

/** La respuesta no tiene la forma que el contrato promete. */
export class ContractError extends Error {
  constructor(what: string) {
    super(`Respuesta fuera de contrato: ${what}`);
    this.name = 'ContractError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new ContractError(what);
  return value;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new ContractError(what);
  return value;
}

export function parseSessionUser(value: unknown): SessionUser {
  const user = record(value, 'user');
  const { unit, roles, permissions } = user;
  if (!isStringArray(roles)) throw new ContractError('user.roles');
  if (!isStringArray(permissions)) throw new ContractError('user.permissions');
  if (unit !== undefined && unit !== null && typeof unit !== 'string') {
    throw new ContractError('user.unit');
  }
  return {
    userId: text(user.userId, 'user.userId'),
    name: text(user.name, 'user.name'),
    email: text(user.email, 'user.email'),
    unit: unit ?? null,
    roles,
    permissions,
  };
}

export function parseLoginResponse(data: unknown): LoginResponse {
  const body = record(data, 'data');
  return {
    sessionState: text(body.sessionState, 'sessionState'),
    expiresAt: text(body.expiresAt, 'expiresAt'),
    user: parseSessionUser(body.user),
  };
}

export function parseCurrentUser(data: unknown): CurrentUserResponse {
  return { user: parseSessionUser(record(data, 'data').user) };
}

export function parseStatus(data: unknown): StatusResponse {
  return { status: text(record(data, 'data').status, 'status') };
}

export function parseRoles(data: unknown): Role[] {
  if (!Array.isArray(data)) throw new ContractError('roles');
  return data.map((item, index) => {
    const role = record(item, `roles[${index}]`);
    return {
      roleId: text(role.roleId ?? role.rolId, 'roleId'),
      code: text(role.code ?? role.codigo, 'code'),
      name: text(role.name ?? role.nombre, 'name'),
    };
  });
}

export function parseFieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((error) =>
    typeof (error.field ?? error.campo) === 'string'
      ? [
          {
            field: (error.field ?? error.campo) as string,
            code:
              typeof (error.code ?? error.codigo) === 'string'
                ? ((error.code ?? error.codigo) as string)
                : '',
          },
        ]
      : [],
  );
}

export function problemCode(problem: unknown): string {
  if (!isRecord(problem)) return '';
  const code = problem.code ?? problem.codigo;
  return typeof code === 'string' ? code : '';
}

export function problemFieldErrors(problem: unknown): FieldError[] {
  return isRecord(problem) ? parseFieldErrors(problem.errors ?? problem.errores) : [];
}
