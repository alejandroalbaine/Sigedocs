/**
 * Mismas reglas que SIGESDOC_BACKEND (domain/policies/politicasAutenticacion.ts).
 * Aquí solo adelantan el aviso al usuario: el backend vuelve a validar.
 */
export const PATRON_CORREO_INSTITUCIONAL = /^[^\s@]+@uapa\.edu\.do$/i;
export const LONGITUD_MINIMA_CONTRASENA = 8;
export const LONGITUD_MAXIMA_CONTRASENA = 128;

export type CampoLogin = 'email' | 'password';
export type ErroresLogin = Partial<Record<CampoLogin, string>>;

export function validarCredenciales(email: string, password: string): ErroresLogin {
  const errores: ErroresLogin = {};
  if (!email.trim()) {
    errores.email = 'Escriba su correo institucional.';
  } else if (!PATRON_CORREO_INSTITUCIONAL.test(email.trim())) {
    errores.email = 'Use su cuenta institucional @uapa.edu.do.';
  }
  if (!password) {
    errores.password = 'Escriba su contraseña.';
  } else if (
    password.length < LONGITUD_MINIMA_CONTRASENA ||
    password.length > LONGITUD_MAXIMA_CONTRASENA
  ) {
    errores.password = `La contraseña debe tener entre ${LONGITUD_MINIMA_CONTRASENA} y ${LONGITUD_MAXIMA_CONTRASENA} caracteres.`;
  }
  return errores;
}
