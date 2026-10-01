/**
 * Contrato MVP de usuarios y roles (SIGESDOC_BACKEND docs/endpoints.md §2, CORE-01/CORE-02).
 * Cada respuesta se valida: si el backend cambia una forma, la interfaz muestra "respuesta no
 * válida" en lugar de fallar en silencio. Durante REF-02 se aceptan los alias en español
 * (`rolId`, `codigo`, `nombre`) que todavía devuelve `/roles`.
 */
import { ContractError, type Role } from './contract.ts';

export interface ManagedUser {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  schoolCode: string | null;
  roles: Role[];
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleCodes: string[];
  schoolCode?: string;
}

export interface UpdateUserInput {
  name?: string;
  isActive?: boolean;
  schoolCode?: string | null;
}

/** Filtros permitidos por `GET /users` (allowlist del contrato). */
export interface UserFilters {
  isActive?: boolean;
  roleCode?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

type Json = Record<string, unknown>;

function record(value: unknown, what: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError(what);
  }
  return value as Json;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new ContractError(what);
  return value;
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new ContractError(what);
  return value;
}

export function parseUserRole(value: unknown, what = 'role'): Role {
  const role = record(value, what);
  return {
    roleId: text(role.roleId ?? role.rolId, `${what}.roleId`),
    code: text(role.code ?? role.codigo, `${what}.code`),
    name: text(role.name ?? role.nombre, `${what}.name`),
  };
}

export function parseUserRoles(value: unknown): Role[] {
  return list(value, 'roles').map((item, i) => parseUserRole(item, `roles[${String(i)}]`));
}

export function parseManagedUser(value: unknown, what = 'user'): ManagedUser {
  const user = record(value, what);
  if (typeof user.isActive !== 'boolean') throw new ContractError(`${what}.isActive`);
  const schoolCode = user.schoolCode ?? null;
  if (schoolCode !== null && typeof schoolCode !== 'string') {
    throw new ContractError(`${what}.schoolCode`);
  }
  return {
    userId: text(user.userId, `${what}.userId`),
    name: text(user.name, `${what}.name`),
    email: text(user.email, `${what}.email`),
    isActive: user.isActive,
    schoolCode,
    roles: list(user.roles, `${what}.roles`).map((item, i) =>
      parseUserRole(item, `${what}.roles[${String(i)}]`),
    ),
    createdAt: text(user.createdAt, `${what}.createdAt`),
  };
}

export function parseManagedUsers(value: unknown): ManagedUser[] {
  return list(value, 'users').map((item, i) => parseManagedUser(item, `users[${String(i)}]`));
}

/** Arma la query de `GET /users` solo con los filtros informados. */
export function userQuery(filters: UserFilters): string {
  const params = new URLSearchParams();
  params.set('limit', String(filters.limit ?? 25));
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.roleCode) params.set('roleCode', filters.roleCode);
  const search = filters.search?.trim();
  if (search) params.set('search', search);
  if (filters.cursor) params.set('cursor', filters.cursor);
  return params.toString();
}
