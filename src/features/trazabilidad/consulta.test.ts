import { FILTROS_VACIOS, type EventoTrazabilidad } from './catalogos.ts';
import { filtrarEventos, ordenarEventos } from './consulta.ts';

function evento(parcial: Partial<EventoTrazabilidad>): EventoTrazabilidad {
  return {
    id: '1',
    fecha: '2026-09-10T10:00:00Z',
    accion: 'state_changed',
    expedienteCodigo: 'ECD-2026-0003',
    expedienteTitulo: 'Contabilidad de Costos',
    usuarioNombre: 'Especialista Curricular',
    usuarioCorreo: '',
    usuarioRol: '',
    version: 'v1.0',
    estadoAnterior: null,
    estadoNuevo: '',
    observacion: 'Iniciar la revisión: Asignado → En revisión.',
    evidencia: null,
    ...parcial,
  };
}

const eventos = [
  evento({ id: '1' }),
  evento({
    id: '2',
    fecha: '2026-09-15T09:00:00Z',
    accion: 'observation_added',
    expedienteCodigo: 'ECD-2026-0004',
    usuarioNombre: 'Dirección de Gestión Curricular',
    version: '',
    observacion: 'Se registró una observación en la sección bibliografia.',
  }),
];

test('sin filtros devuelve todos los eventos', () => {
  expect(filtrarEventos(eventos, FILTROS_VACIOS)).toHaveLength(2);
});

test('filtra por expediente, usuario, rango de fechas y texto', () => {
  const ids = (filtros: Partial<typeof FILTROS_VACIOS>) =>
    filtrarEventos(eventos, { ...FILTROS_VACIOS, ...filtros }).map((e) => e.id);

  expect(ids({ expediente: 'ECD-2026-0004' })).toEqual(['2']);
  expect(ids({ usuario: 'DIRECCIÓN' })).toEqual(['2']);
  expect(ids({ desde: '2026-09-11' })).toEqual(['2']);
  expect(ids({ hasta: '2026-09-10' })).toEqual(['1']);
  expect(ids({ texto: 'bibliografia' })).toEqual(['2']);
  expect(ids({ texto: 'ninguna' })).toEqual([]);
});

test('un evento sin versión ni actor de sistema no rompe el filtrado', () => {
  const soloTexto = filtrarEventos(eventos, { ...FILTROS_VACIOS, texto: 'En revisión' });
  expect(soloTexto.map((e) => e.id)).toEqual(['1']);
});

test('ordena por columna en ambos sentidos', () => {
  expect(ordenarEventos(eventos, { key: 'fecha', direction: 'desc' }).map((e) => e.id)).toEqual([
    '2',
    '1',
  ]);
  expect(
    ordenarEventos(eventos, { key: 'usuarioNombre', direction: 'asc' }).map((e) => e.id),
  ).toEqual(['2', '1']);
  expect(ordenarEventos(eventos, { key: 'desconocida', direction: 'asc' })).toHaveLength(2);
});
