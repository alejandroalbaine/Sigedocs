import { ApiError, errorMessage } from '../../common/api/errors.ts';
import type { ManagedUser } from '../../common/api/userContract.ts';

/**
 * Códigos de rol del contrato final (inglés, ADR-011) por su alias transitorio en español
 * (naming-glossary.md §6). `/roles` todavía responde con el alias y `/users` con el final:
 * la interfaz compara ambos y envía siempre el código del contrato.
 */
const CONTRATO_POR_ALIAS: Readonly<Record<string, string>> = {
  ADMIN_SISTEMA: 'SYSTEM_ADMIN',
  DIR_GESTION_CURRICULAR: 'CURRICULUM_DIRECTOR',
  ESPECIALISTA_CURRICULAR: 'CURRICULUM_SPECIALIST',
  VRA: 'VP_ACADEMIC',
  DIR_ACADEMICA_GRADO: 'ACADEMIC_DIRECTOR_UNDERGRAD',
  VRIP: 'VP_RESEARCH_GRADUATE',
  DIR_ACADEMICA_POSGRADO: 'ACADEMIC_DIRECTOR_GRADUATE',
  DIR_ESCUELA: 'SCHOOL_DIRECTOR',
  COORD_PROGRAMA: 'PROGRAM_COORDINATOR',
  FACILITADOR: 'FACILITATOR',
  VPID: 'VP_PLANNING',
  CINGEP: 'CINGEP',
};

export function codigoContrato(codigo: string): string {
  return CONTRATO_POR_ALIAS[codigo] ?? codigo;
}

export function mismoRol(a: string, b: string): boolean {
  return codigoContrato(a) === codigoContrato(b);
}

/** El contrato exige `schoolCode` a quien tenga el rol de Director de Escuela. */
export function requiereEscuela(codigos: readonly string[]): boolean {
  return codigos.some((codigo) => codigoContrato(codigo) === 'SCHOOL_DIRECTOR');
}

export interface OpcionRol {
  code: string;
  name: string;
}

/** Opciones de rol a partir de los nombres que la sesión ya obtuvo de `GET /roles`. */
export function opcionesDeRol(roleNames: ReadonlyMap<string, string>): OpcionRol[] {
  return [...roleNames]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export type EstadoFiltro = '' | 'activos' | 'inactivos';

export interface FiltrosUsuarios {
  texto: string;
  rol: string;
  estado: EstadoFiltro;
}

export const FILTROS_VACIOS: FiltrosUsuarios = { texto: '', rol: '', estado: '' };

export function filtrosServidor(filtros: FiltrosUsuarios) {
  return {
    ...(filtros.estado ? { isActive: filtros.estado === 'activos' } : {}),
    ...(filtros.rol ? { roleCode: codigoContrato(filtros.rol) } : {}),
    ...(filtros.texto.trim() ? { search: filtros.texto.trim() } : {}),
  };
}

export interface DatosUsuario {
  name: string;
  email: string;
  password: string;
  roleCodes: string[];
  schoolCode: string;
}

export const USUARIO_VACIO: DatosUsuario = {
  name: '',
  email: '',
  password: '',
  roleCodes: [],
  schoolCode: '',
};

export function datosDe(usuario: ManagedUser): DatosUsuario {
  return {
    name: usuario.name,
    email: usuario.email,
    password: '',
    roleCodes: usuario.roles.map((rol) => rol.code),
    schoolCode: usuario.schoolCode ?? '',
  };
}

export type ErroresUsuario = Partial<Record<keyof DatosUsuario, string>>;

const CORREO_INSTITUCIONAL = /^[^\s@]+@uapa\.edu\.do$/i;

/** Mismas reglas que el backend (politicasAutenticacion.ts y endpoints.md §2). */
export function validarUsuario(datos: DatosUsuario, creando: boolean): ErroresUsuario {
  const errores: ErroresUsuario = {};
  if (!datos.name.trim()) errores.name = 'Indique el nombre completo.';
  if (creando) {
    if (!CORREO_INSTITUCIONAL.test(datos.email.trim())) {
      errores.email = 'Use un correo institucional @uapa.edu.do.';
    }
    if (datos.password.length < 8 || datos.password.length > 128) {
      errores.password = 'La contraseña debe tener entre 8 y 128 caracteres.';
    }
    if (datos.roleCodes.length === 0) errores.roleCodes = 'Asigne al menos un rol.';
  }
  if (requiereEscuela(datos.roleCodes) && !datos.schoolCode.trim()) {
    errores.schoolCode = 'El Director de Escuela necesita un código de escuela.';
  }
  return errores;
}

const CAMPOS: readonly (keyof DatosUsuario)[] = [
  'name',
  'email',
  'password',
  'roleCodes',
  'schoolCode',
];

function esCampo(campo: string): campo is keyof DatosUsuario {
  return (CAMPOS as readonly string[]).includes(campo);
}

/** Traduce un error del servidor a un mensaje general y, si los hay, errores por campo. */
export function erroresDelServidor(
  error: unknown,
  respaldo: string,
): { mensaje: string; campos: ErroresUsuario } {
  if (!(error instanceof ApiError)) return { mensaje: respaldo, campos: {} };
  if (error.status === 409) {
    return {
      mensaje: 'Ya existe un usuario con ese correo institucional.',
      campos: { email: 'Este correo ya está registrado.' },
    };
  }
  if (error.status === 403) {
    return {
      mensaje:
        'No tiene permiso para esta acción. Nadie puede cambiar sus propios roles ni permisos.',
      campos: {},
    };
  }
  const campos: ErroresUsuario = {};
  for (const { field } of error.fieldErrors) {
    if (esCampo(field)) campos[field] = 'Revise este dato.';
  }
  return { mensaje: errorMessage(error, respaldo), campos };
}
