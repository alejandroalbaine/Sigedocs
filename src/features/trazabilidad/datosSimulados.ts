import type { EventoTrazabilidad } from './catalogos.ts';

/**
 * Cuentas reales del catálogo institucional: las mismas que `CuentasDePrueba.tsx` y la
 * siembra `database/scripts/seed-test-users.mjs`. Toda notificación se dirige a usuarios ya
 * dados de alta en `users`: una o varias personas involucradas, más la Dirección y Desarrollo
 * Curricular, que es otro usuario del catálogo.
 */
const DIRECCION_Y_DESARROLLO = 'dir.curricular@uapa.edu.do';
const ESPECIALISTA = 'especialista.curricular@uapa.edu.do';
const COORDINADOR = 'coord.programa@uapa.edu.do';
const FACILITADOR = 'facilitador@uapa.edu.do';
const DIRECTOR_ESCUELA = 'dir.escuela@uapa.edu.do';

/**
 * Eventos simulados para construir y revisar la interfaz mientras el backend no publica
 * el detalle del aviso por correo en `GET /api/v1/dossiers/{dossierId}/notifications`.
 * Cubren los tres estados de envío (enviado, fallido y en preparación), un evento sin
 * campo `notificacion` —que la vista degrada a «En preparación»— y un envío con más de
 * dos destinatarios para ejercitar el desplegable.
 */
export const EVENTOS_SIMULADOS: readonly EventoTrazabilidad[] = [
  {
    id: 'evt-1041',
    fecha: '2026-09-28T14:05:00Z',
    accion: 'aprobar_revision',
    expedienteCodigo: 'EXP-2026-0148',
    expedienteTitulo: 'Licenciatura en Educación Física',
    usuarioNombre: 'Vicerrectoria Academica',
    usuarioCorreo: 'vra@uapa.edu.do',
    usuarioRol: 'VP_ACADEMIC',
    version: 'v1.2',
    estadoAnterior: 'en_revision',
    estadoNuevo: 'aprobado_para_pilotaje',
    observacion: 'La malla curricular cumple con el eje de formación inicial.',
    evidencia: 'acta-revision-0148.pdf',
    notificacion: {
      estado: 'enviado',
      destinatarios: [COORDINADOR, DIRECCION_Y_DESARROLLO],
    },
  },
  {
    id: 'evt-1042',
    fecha: '2026-09-28T16:40:00Z',
    accion: 'requiere_cambios',
    expedienteCodigo: 'EXP-2026-0151',
    expedienteTitulo: 'Técnico Medio en Infermería',
    usuarioNombre: 'Coordinador de Programa',
    usuarioCorreo: 'coord.programa@uapa.edu.do',
    usuarioRol: 'PROGRAM_COORDINATOR',
    version: 'v1',
    estadoAnterior: 'en_revision',
    estadoNuevo: 'requiere_ajustes',
    observacion: 'Faltan los descriptivos de dos asignaturas del tercer cuatrimestre.',
    evidencia: null,
    notificacion: {
      estado: 'fallido',
      destinatarios: [ESPECIALISTA, DIRECCION_Y_DESARROLLO],
    },
  },
  {
    id: 'evt-1043',
    fecha: '2026-09-29T09:15:00Z',
    accion: 'iniciar_reevaluacion',
    expedienteCodigo: 'EXP-2026-0148',
    expedienteTitulo: 'Licenciatura en Educación Física',
    usuarioNombre: 'Especialista Curricular',
    usuarioCorreo: 'especialista.curricular@uapa.edu.do',
    usuarioRol: 'CURRICULUM_SPECIALIST',
    version: 'v1.3',
    estadoAnterior: 'reenviado',
    estadoNuevo: 'en_reevaluacion',
    observacion: 'El docente Allan Saint-Louis atendió los ajustes solicitados.',
    evidencia: 'version-1-3.pdf',
    notificacion: {
      estado: 'en_preparacion',
      destinatarios: [],
    },
  },
  {
    id: 'evt-1044',
    fecha: '2026-09-29T11:30:00Z',
    accion: 'publicar_pilotaje',
    expedienteCodigo: 'EXP-2026-0148',
    expedienteTitulo: 'Licenciatura en Educación Física',
    usuarioNombre: 'Direccion Academica de Grado',
    usuarioCorreo: 'dir.grado@uapa.edu.do',
    usuarioRol: 'ACADEMIC_DIRECTOR_UNDERGRAD',
    version: 'v1.4',
    estadoAnterior: 'aprobado_para_pilotaje',
    estadoNuevo: 'en_pilotaje',
    observacion: 'Piloto autorizado para las tres secciones del campus principal.',
    evidencia: 'plan-pilotaje-0148.pdf',
    notificacion: {
      estado: 'enviado',
      destinatarios: [
        ESPECIALISTA,
        COORDINADOR,
        FACILITADOR,
        DIRECTOR_ESCUELA,
        DIRECCION_Y_DESARROLLO,
      ],
    },
  },
  {
    id: 'evt-1045',
    fecha: '2026-09-29T13:05:00Z',
    accion: 'cerrar_sin_cambios',
    expedienteCodigo: 'EXP-2026-0151',
    expedienteTitulo: 'Técnico Medio en Infermería',
    usuarioNombre: 'Admin del Sistema',
    usuarioCorreo: 'admin.sistema@uapa.edu.do',
    usuarioRol: 'SYSTEM_ADMIN',
    version: 'v1',
    estadoAnterior: 'aprobado_para_pilotaje',
    estadoNuevo: 'definitivo',
    observacion: 'El expediente se cierra sin cambios; no se notifica por correo.',
    evidencia: null,
  },
];
