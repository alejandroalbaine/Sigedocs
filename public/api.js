import { API_BASE_URL } from './config.js';

const routes = Object.freeze({
  health: { method: 'GET', path: '/api/v1/status' },
  login: { method: 'POST', path: '/api/v1/sessions' },
  me: { method: 'GET', path: '/api/v1/users/current' },
  logout: { method: 'DELETE', path: '/api/v1/sessions/current' }
});

const fieldLabels = Object.freeze({
  email: 'correo institucional',
  password: 'contraseña',
  remember: 'recordar sesión'
});

const messagesByCode = Object.freeze({
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  NO_AUTENTICADO: 'Su sesión ha expirado. Inicie sesión nuevamente.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos. Espere unos minutos antes de volver a intentar.',
  ACCESO_DENEGADO: 'No tiene permiso para realizar esta acción.',
  VALIDACION_FALLIDA: 'Revise los campos indicados.',
  RECURSO_NO_ENCONTRADO: 'El recurso solicitado no está disponible.',
  ERROR_INTERNO: 'El servicio no está disponible en este momento. Inténtelo más tarde.'
});

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', fieldErrors = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function buildUrl(path, baseUrl) {
  if (typeof baseUrl !== 'string') {
    throw new ApiError('La dirección de la API no está configurada correctamente.');
  }
  const value = baseUrl.trim();
  if (!value) return path;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError('La dirección de la API no está configurada correctamente.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) {
    throw new ApiError('La dirección de la API debe contener solo el origen HTTP o HTTPS, sin rutas ni credenciales.');
  }
  return url.origin + path;
}

function fallbackMessage(status, operation) {
  if (status === 400 || status === 422) return 'Revise los datos ingresados.';
  if (status === 401) {
    return operation === 'login'
      ? 'Correo o contraseña incorrectos.'
      : 'Su sesión ha expirado. Inicie sesión nuevamente.';
  }
  if (status === 403) return messagesByCode.ACCESO_DENEGADO;
  if (status === 429) return messagesByCode.DEMASIADOS_INTENTOS;
  if (status >= 500) return messagesByCode.ERROR_INTERNO;
  return 'No se pudo completar la solicitud. Inténtelo de nuevo.';
}

function normalizeFieldErrors(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((error) => error && typeof error.campo === 'string')
    .map((error) => ({
      field: error.campo,
      code: typeof error.codigo === 'string' ? error.codigo : ''
    }));
}

function problemMessage(problem, status, operation, fieldErrors) {
  if (problem?.codigo === 'NO_AUTENTICADO' && operation === 'login') {
    return messagesByCode.CREDENCIALES_INVALIDAS;
  }
  if (problem?.codigo === 'VALIDACION_FALLIDA' && fieldErrors.length > 0) {
    const labels = [...new Set(fieldErrors.map(({ field }) => fieldLabels[field] || 'dato solicitado'))];
    return `Revise: ${labels.join(', ')}.`;
  }
  return messagesByCode[problem?.codigo] || fallbackMessage(status, operation);
}

async function readJson(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.includes('json')) return null;
  return response.json();
}

export function createApiClient({
  baseUrl = API_BASE_URL,
  timeoutMs = 10_000,
  fetchImpl = (...args) => globalThis.fetch(...args)
} = {}) {
  async function request(operation, body) {
    if (!Object.hasOwn(routes, operation)) {
      throw new ApiError('La operación solicitada no está disponible.');
    }
    const route = routes[operation];
    const url = buildUrl(route.path, baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: route.method,
        credentials: 'include',
        headers: {
          Accept: 'application/json, application/problem+json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal
      });

      if (response.status === 204) return null;

      let payload;
      try {
        payload = await readJson(response);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        throw new ApiError('El servidor devolvió una respuesta no válida. Inténtelo de nuevo.');
      }

      if (!response.ok) {
        const fieldErrors = normalizeFieldErrors(payload?.errores);
        throw new ApiError(problemMessage(payload, response.status, operation, fieldErrors), {
          status: response.status,
          code: typeof payload?.codigo === 'string' ? payload.codigo : '',
          fieldErrors
        });
      }
      if (!payload || !Object.hasOwn(payload, 'data')) {
        throw new ApiError('El servidor devolvió una respuesta no válida. Inténtelo de nuevo.');
      }
      return payload.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) {
        throw new ApiError('El servidor tardó demasiado en responder. Inténtelo de nuevo.');
      }
      throw new ApiError('No se pudo conectar con el servidor de SIGESDOC. Compruebe su conexión e inténtelo de nuevo.');
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({ request });
}

export const api = createApiClient();
