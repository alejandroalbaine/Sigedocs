import {
  parseRoles,
  parseUser,
  parseUsers,
  type Role,
  type User,
} from '../../common/api/contract.ts';
import { domainRequest } from '../../common/api/domainClient.ts';

export interface FiltrosUsuarios {
  search: string;
  /** `''` = todos. */
  isActive: '' | 'true' | 'false';
  roleCode: string;
}

export const FILTROS_VACIOS: FiltrosUsuarios = { search: '', isActive: '', roleCode: '' };

export interface PaginaUsuarios {
  users: User[];
  nextCursor: string | null;
}

export interface NuevoUsuario {
  name: string;
  email: string;
  password: string;
  roleCodes: string[];
  schoolCode?: string;
}

export interface CambioUsuario {
  name?: string;
  isActive?: boolean;
  schoolCode?: string;
}

const LIMITE = 25;

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

/** `GET /users?isActive&roleCode&search&limit&cursor` (solo se envían los filtros con valor). */
export async function listarUsuarios(
  filtros: FiltrosUsuarios,
  cursor?: string,
): Promise<PaginaUsuarios> {
  const params = new URLSearchParams({ limit: String(LIMITE) });
  const search = filtros.search.trim();
  if (search) params.set('search', search);
  if (filtros.isActive) params.set('isActive', filtros.isActive);
  if (filtros.roleCode) params.set('roleCode', filtros.roleCode);
  if (cursor) params.set('cursor', cursor);
  const { data, meta } = await domainRequest<unknown>(`/users?${params.toString()}`);
  return { users: parseUsers(data), nextCursor: meta?.pagination?.nextCursor ?? null };
}

export async function listarRoles(): Promise<Role[]> {
  const { data } = await domainRequest<unknown>('/roles');
  return parseRoles(data);
}

export async function crearUsuario(input: NuevoUsuario): Promise<User> {
  const { data } = await domainRequest<unknown>('/users', jsonInit('POST', input));
  return parseUser(data);
}

export async function modificarUsuario(userId: string, cambio: CambioUsuario): Promise<User> {
  const { data } = await domainRequest<unknown>(
    `/users/${encodeURIComponent(userId)}`,
    jsonInit('PATCH', cambio),
  );
  return parseUser(data);
}

/** `PUT /users/{id}/roles` reemplaza el conjunto completo de roles. */
export async function reemplazarRoles(userId: string, roleCodes: string[]): Promise<User> {
  const { data } = await domainRequest<unknown>(
    `/users/${encodeURIComponent(userId)}/roles`,
    jsonInit('PUT', { roleCodes }),
  );
  return parseUser(data);
}
