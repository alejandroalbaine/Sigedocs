/**
 * Llamadas del contrato MVP de usuarios y roles (CORE-01/CORE-02). Todas exigen `users.manage`
 * en el servidor; ocultar la pantalla sin ese permiso solo mejora la experiencia.
 */
import { validatedRequest as request } from './domainClient.ts';
import {
  parseManagedUser,
  parseManagedUsers,
  parseUserRoles,
  userQuery,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilters,
} from './userContract.ts';

const id = (value: string) => encodeURIComponent(value);
const send = (method: 'POST' | 'PATCH' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const usersApi = {
  list: (filters: UserFilters = {}) => request(`/users?${userQuery(filters)}`, parseManagedUsers),
  get: (userId: string) => request(`/users/${id(userId)}`, (data) => parseManagedUser(data)),
  create: (input: CreateUserInput) =>
    request('/users', (data) => parseManagedUser(data), send('POST', input)),
  update: (userId: string, changes: UpdateUserInput) =>
    request(`/users/${id(userId)}`, (data) => parseManagedUser(data), send('PATCH', changes)),
  roles: (userId: string) => request(`/users/${id(userId)}/roles`, parseUserRoles),
  /** Reemplaza la lista completa de roles del usuario. */
  setRoles: (userId: string, roleCodes: string[]) =>
    request(
      `/users/${id(userId)}/roles`,
      (data) => parseManagedUser(data),
      send('PUT', { roleCodes }),
    ),
};
