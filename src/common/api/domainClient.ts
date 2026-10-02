import { API_BASE_URL } from '../config.ts';
import { ApiError, fallbackMessage, INVALID_RESPONSE, messagesByCode, NETWORK } from './errors.ts';
import { buildUrl } from './client.ts';
import { ContractError, problemCode, problemFieldErrors } from './contract.ts';

export interface PageMeta {
  pagination?: { nextCursor: string | null; limit: number };
}

function normalizedMeta(value: unknown): PageMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const meta = value as Record<string, unknown>;
  const raw = meta.pagination ?? meta.paginacion;
  if (typeof raw !== 'object' || raw === null) return undefined;
  const pagination = raw as Record<string, unknown>;
  const cursor = pagination.next ?? pagination.nextCursor ?? pagination.cursorSiguiente ?? null;
  const limit = pagination.limit ?? pagination.limite;
  if ((cursor !== null && typeof cursor !== 'string') || typeof limit !== 'number') {
    return undefined;
  }
  return { pagination: { nextCursor: cursor, limit } };
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function domainRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: PageMeta }> {
  try {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json, application/problem+json');
    if (init.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(buildUrl(`/api/v1${path}`, API_BASE_URL), {
      ...init,
      credentials: 'include',
      headers,
    });
    if (response.status === 204) return { data: undefined as T };
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) throw new ApiError(INVALID_RESPONSE);
    const rawPayload: unknown = await response.json();
    if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
      throw new ApiError(INVALID_RESPONSE);
    }
    const payload = rawPayload as Record<string, unknown>;
    if (!response.ok) {
      const code = problemCode(payload);
      const fieldErrors = problemFieldErrors(payload);
      const message = messagesByCode[code] ?? fallbackMessage(response.status, false);
      if (response.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sigesdoc:session-expired'));
      }
      throw new ApiError(message, {
        status: response.status,
        code,
        fieldErrors,
      });
    }
    if (!('data' in payload)) throw new ApiError(INVALID_RESPONSE);
    const meta = normalizedMeta(payload.meta);
    return meta ? { data: payload.data as T, meta } : { data: payload.data as T };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(NETWORK);
  }
}

/**
 * `domainRequest` más el validador del contrato: si `data` no tiene la forma prometida, la
 * interfaz muestra "respuesta no válida" en lugar de usar datos a medias.
 */
export async function validatedRequest<T>(
  path: string,
  parse: (data: unknown) => T,
  init?: RequestInit,
): Promise<{ data: T; meta?: PageMeta }> {
  const { data, meta } = await domainRequest<unknown>(path, init);
  try {
    return meta ? { data: parse(data), meta } : { data: parse(data) };
  } catch (error) {
    // templateContract.ts señala su propio incumplimiento con "Plantilla fuera de contrato".
    const fueraDeContrato =
      error instanceof ContractError ||
      (error instanceof Error && error.message.startsWith('Plantilla fuera de contrato'));
    if (fueraDeContrato) throw new ApiError(INVALID_RESPONSE);
    throw error;
  }
}
