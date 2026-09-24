import { API_BASE_URL } from '../config.ts';
import {
  ContractError,
  parseCurrentUser,
  parseLoginResponse,
  parseRoles,
  parseStatus,
  problemCode,
  problemFieldErrors,
  type FieldError,
  type LoginRequest,
} from './contract.ts';
import {
  ApiError,
  BAD_BASE_URL,
  INVALID_RESPONSE,
  NETWORK,
  TIMEOUT,
  fallbackMessage,
  messagesByCode,
} from './errors.ts';

const fieldLabels: Readonly<Record<string, string>> = {
  email: 'correo institucional',
  password: 'contraseña',
  remember: 'recordar sesión',
};

/** Cada operación declara su ruta y el validador que confirma la forma de `data`. */
const routes = {
  status: { method: 'GET', path: '/api/v1/status', parse: parseStatus },
  login: { method: 'POST', path: '/api/v1/sessions', parse: parseLoginResponse },
  currentUser: { method: 'GET', path: '/api/v1/users/current', parse: parseCurrentUser },
  logout: { method: 'DELETE', path: '/api/v1/sessions/current', parse: (): null => null },
  roles: { method: 'GET', path: '/api/v1/roles', parse: parseRoles },
} as const;

interface RequestBodies {
  login: LoginRequest;
}

export type Operation = keyof typeof routes;
export type ResponseOf<Op extends Operation> = ReturnType<(typeof routes)[Op]['parse']>;
type BodyArgs<Op extends Operation> = Op extends keyof RequestBodies
  ? [body: RequestBodies[Op]]
  : [];

export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

export interface ApiClient {
  request<Op extends Operation>(operation: Op, ...body: BodyArgs<Op>): Promise<ResponseOf<Op>>;
}

export function buildUrl(path: string, baseUrl: string): string {
  const value = baseUrl.trim();
  if (!value) return path;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(BAD_BASE_URL);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new ApiError(BAD_BASE_URL);
  }
  return url.origin + path;
}

function problemMessage(code: string, status: number, isLogin: boolean, fieldErrors: FieldError[]) {
  if (code === 'VALIDACION_FALLIDA' && fieldErrors.length > 0) {
    const labels = [
      ...new Set(fieldErrors.map(({ field }) => fieldLabels[field] ?? 'dato solicitado')),
    ];
    return `Revise: ${labels.join(', ')}.`;
  }
  return messagesByCode[code] ?? fallbackMessage(status, isLogin);
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) return null;
  return (await response.json()) as unknown;
}

export function createApiClient({
  baseUrl = API_BASE_URL,
  timeoutMs = 10_000,
  fetchImpl = (input, init) => globalThis.fetch(input, init),
}: { baseUrl?: string; timeoutMs?: number; fetchImpl?: FetchImpl } = {}): ApiClient {
  async function request<Op extends Operation>(
    operation: Op,
    ...[body]: BodyArgs<Op>
  ): Promise<ResponseOf<Op>> {
    const route = routes[operation];
    const url = buildUrl(route.path, baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: route.method,
        credentials: 'include',
        headers: {
          Accept: 'application/json, application/problem+json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });

      if (response.status === 204) return route.parse(null) as ResponseOf<Op>;

      let payload: unknown;
      try {
        payload = await readJson(response);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        throw new ApiError(INVALID_RESPONSE, { status: response.status });
      }

      if (!response.ok) {
        const code = problemCode(payload);
        const fieldErrors = problemFieldErrors(payload);
        throw new ApiError(
          problemMessage(code, response.status, operation === 'login', fieldErrors),
          {
            status: response.status,
            code,
            fieldErrors,
          },
        );
      }

      if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
        throw new ApiError(INVALID_RESPONSE, { status: response.status });
      }
      return route.parse(payload.data) as ResponseOf<Op>;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof ContractError) {
        console.error(`[${operation}]`, error.message);
        throw new ApiError(INVALID_RESPONSE);
      }
      if (controller.signal.aborted) throw new ApiError(TIMEOUT);
      throw new ApiError(NETWORK);
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({ request });
}

export const api = createApiClient();
