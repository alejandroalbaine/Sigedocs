import type { FieldError } from '../../common/api/contract.ts';

export const SCHOOL_DIRECTOR = 'SCHOOL_DIRECTOR';

export interface DatosUsuario {
  name: string;
  email: string;
  password: string;
  roleCodes: string[];
  schoolCode: string;
}

export type ErroresUsuario = Partial<Record<keyof DatosUsuario, string>>;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reglas de CORE-01: correo válido, contraseña inicial y `schoolCode` si hay `SCHOOL_DIRECTOR`. */
export function validarNuevoUsuario(datos: DatosUsuario): ErroresUsuario {
  const errores: ErroresUsuario = {};
  if (!datos.name.trim()) errores.name = 'Escriba el nombre completo.';
  if (!CORREO.test(datos.email.trim())) errores.email = 'Escriba un correo válido.';
  if (datos.password.length < 8) errores.password = 'Use al menos 8 caracteres.';
  if (datos.roleCodes.length === 0) errores.roleCodes = 'Seleccione al menos un rol.';
  if (requiereEscuela(datos.roleCodes) && !datos.schoolCode.trim()) {
    errores.schoolCode = 'La escuela es obligatoria para Director de Escuela.';
  }
  return errores;
}

export function requiereEscuela(roleCodes: readonly string[]): boolean {
  return roleCodes.includes(SCHOOL_DIRECTOR);
}

const CAMPOS_API: Readonly<Record<string, keyof DatosUsuario>> = {
  name: 'name',
  email: 'email',
  password: 'password',
  roleCodes: 'roleCodes',
  schoolCode: 'schoolCode',
};

/** Errores de campo del servidor (`VALIDATION_FAILED`) hacia los campos del formulario. */
export function erroresDelServidor(fieldErrors: readonly FieldError[]): ErroresUsuario {
  const errores: ErroresUsuario = {};
  for (const { field } of fieldErrors) {
    const campo = CAMPOS_API[field];
    if (campo) errores[campo] = 'El servidor rechazó este valor.';
  }
  return errores;
}
