import type { FieldError } from './contract.ts';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(
    message: string,
    {
      status = 0,
      code = '',
      fieldErrors = [],
    }: { status?: number; code?: string; fieldErrors?: FieldError[] } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const UNAVAILABLE = 'El servicio no está disponible en este momento. Inténtelo más tarde.';

/**
 * Mensajes por `code` del contrato final y por sus alias transitorios (ADR-006/ADR-011).
 * La interfaz nunca muestra `title` ni `detail` del servidor.
 */
export const messagesByCode: Readonly<Record<string, string>> = Object.freeze({
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  USER_INACTIVE: 'Su cuenta está inactiva. Comuníquese con la Mesa de Ayuda TI.',
  USUARIO_INACTIVO: 'Su cuenta está inactiva. Comuníquese con la Mesa de Ayuda TI.',
  USER_WITHOUT_ROLE: 'Su cuenta no tiene un rol asignado. Solicite acceso a la Mesa de Ayuda TI.',
  USUARIO_SIN_ROL: 'Su cuenta no tiene un rol asignado. Solicite acceso a la Mesa de Ayuda TI.',
  SESSION_MISSING: 'Inicie sesión para continuar.',
  SESION_AUSENTE: 'Inicie sesión para continuar.',
  SESSION_EXPIRED: 'Su sesión expiró. Inicie sesión nuevamente.',
  SESION_EXPIRADA: 'Su sesión expiró. Inicie sesión nuevamente.',
  SESSION_INVALID: 'Su sesión ya no es válida. Inicie sesión nuevamente.',
  SESION_INVALIDA: 'Su sesión ya no es válida. Inicie sesión nuevamente.',
  UNAUTHENTICATED: 'Su sesión ha expirado. Inicie sesión nuevamente.',
  NO_AUTENTICADO: 'Su sesión ha expirado. Inicie sesión nuevamente.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espere unos minutos antes de volver a intentar.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos. Espere unos minutos antes de volver a intentar.',
  FORBIDDEN: 'No tiene permiso para realizar esta acción.',
  ACCESO_DENEGADO: 'No tiene permiso para realizar esta acción.',
  VALIDATION_FAILED: 'Revise los campos indicados.',
  VALIDACION_FALLIDA: 'Revise los campos indicados.',
  MALFORMED_REQUEST: 'La solicitud no pudo procesarse. Recargue la página e inténtelo de nuevo.',
  SOLICITUD_MALFORMADA: 'La solicitud no pudo procesarse. Recargue la página e inténtelo de nuevo.',
  NOT_FOUND: 'El recurso solicitado no está disponible.',
  RECURSO_NO_ENCONTRADO: 'El recurso solicitado no está disponible.',
  SERVICE_UNAVAILABLE: UNAVAILABLE,
  SERVICIO_NO_DISPONIBLE: UNAVAILABLE,
  DEPENDENCY_UNAVAILABLE: UNAVAILABLE,
  DEPENDENCIA_NO_DISPONIBLE: UNAVAILABLE,
  CONFLICT: 'La información cambió o entra en conflicto. Actualice la página e inténtelo de nuevo.',
  INVALID_TRANSITION: 'El movimiento solicitado no está permitido en el estado actual.',
  IMMUTABLE_VERSION: 'Esta versión ya no puede modificarse.',
  NO_VALID_TEMPLATE_VERSION: 'No existe una plantilla vigente para este expediente.',
  INTERNAL_ERROR: UNAVAILABLE,
  ERROR_INTERNO: UNAVAILABLE,
});

export const INVALID_RESPONSE = 'El servidor devolvió una respuesta no válida. Inténtelo de nuevo.';
export const TIMEOUT = 'El servidor tardó demasiado en responder. Inténtelo de nuevo.';
export const NETWORK =
  'No se pudo conectar con el servidor de SIGESDOC. Compruebe su conexión e inténtelo de nuevo.';
export const BAD_BASE_URL =
  'La dirección de la API debe contener solo el origen HTTP o HTTPS, sin rutas ni credenciales.';

export function fallbackMessage(status: number, isLogin: boolean): string {
  if (status === 400 || status === 422) return 'Revise los datos ingresados.';
  if (status === 401) {
    return isLogin
      ? 'Correo o contraseña incorrectos.'
      : 'Su sesión ha expirado. Inicie sesión nuevamente.';
  }
  if (status === 403) return messagesByCode.ACCESO_DENEGADO ?? '';
  if (status === 429) return messagesByCode.DEMASIADOS_INTENTOS ?? '';
  if (status >= 500) return UNAVAILABLE;
  return 'No se pudo completar la solicitud. Inténtelo de nuevo.';
}

/** 401 fuera del login: no hay sesión utilizable y la interfaz debe volver al acceso. */
export function isSessionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function errorMessage(error: unknown, fallback = 'No se pudo completar la operación.') {
  return error instanceof ApiError ? error.message : fallback;
}
