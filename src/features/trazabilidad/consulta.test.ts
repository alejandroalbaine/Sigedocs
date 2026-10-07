import { FILTROS_VACIOS, type EventoTrazabilidad } from './catalogos.ts';
import { filtrarEventos, ordenarEventos } from './consulta.ts';

function evento(parcial: Partial<EventoTrazabilidad>): EventoTrazabilidad {
  return {
    id: '1',
    fecha: '2026-09-10T10:00:00Z',
    accion: 'iniciar_revision',
    expedienteCodigo: 'EXP-001',
    expedienteTitulo: 'Licenciatura en Educación',
    usuarioNombre: 'Ana Pérez',
    usuarioCorreo: 'ana@uapa.edu.do',
    usuarioRol: 'ESPECIALISTA_CURRICULAR',
    version: 'v1',
    estadoAnterior: 'asignado',
    estadoNuevo: 'en_revision',
    observacion: null,
    evidencia: null,
    ...parcial,
  };
}

const eventos = [
  evento({ id: '1' }),
  evento({
    id: '2',
    fecha: '2026-09-15T09:00:00Z',
    accion: 'aprobar_revision',
    expedienteCodigo: 'EXP-002',
    usuarioNombre: 'Luis Gómez',
    usuarioCorreo: 'luis@uapa.edu.do',
    estadoNuevo: 'aprobado_para_pilotaje',
    observacion: 'Cumple con la malla',
  }),
];

test('sin filtros devuelve todos los eventos', () => {
  expect(filtrarEventos(eventos, FILTROS_VACIOS)).toHaveLength(2);
});

test('filtra por acción, estado, usuario y rango de fechas', () => {
  const ids = (filtros: Partial<typeof FILTROS_VACIOS>) =>
    filtrarEventos(eventos, { ...FILTROS_VACIOS, ...filtros }).map((e) => e.id);

  expect(ids({ accion: 'aprobar_revision' })).toEqual(['2']);
  expect(ids({ estado: 'en_revision' })).toEqual(['1']);
  expect(ids({ usuario: 'LUIS@' })).toEqual(['2']);
  expect(ids({ desde: '2026-09-11' })).toEqual(['2']);
  expect(ids({ hasta: '2026-09-10' })).toEqual(['1']);
  expect(ids({ texto: 'malla' })).toEqual(['2']);
});

test('ordena por columna en ambos sentidos', () => {
  expect(ordenarEventos(eventos, { key: 'fecha', direction: 'desc' }).map((e) => e.id)).toEqual([
    '2',
    '1',
  ]);
  expect(
    ordenarEventos(eventos, { key: 'usuarioNombre', direction: 'asc' }).map((e) => e.id),
  ).toEqual(['1', '2']);
});

test('el texto libre también busca entre los destinatarios notificados', () => {
  const notificados = [
    evento({
      id: 'a',
      notificacion: { estado: 'enviado', destinatarios: ['docente@uapa.edu.do'] },
    }),
    evento({
      id: 'b',
      notificacion: {
        estado: 'fallido',
        destinatarios: ['direccion@uapa.edu.do'],
        detalleError: 'SMTP 550: dirección rechazada.',
      },
    }),
  ];
  const ids = (texto: string) =>
    filtrarEventos(notificados, { ...FILTROS_VACIOS, texto }).map((e) => e.id);

  expect(ids('DOCENTE@')).toEqual(['a']);
  expect(ids('direccion@')).toEqual(['b']);
  expect(ids('smtp 550')).toEqual(['b']);
});
