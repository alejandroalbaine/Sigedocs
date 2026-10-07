import type { AuditEvent } from '../../common/api/dossierContract.ts';
import { consultaServidor, filtrarPorTexto, ordenarEventos } from './consulta.ts';

function evento(parcial: Partial<AuditEvent>): AuditEvent {
  return {
    eventId: '1',
    type: 'state_changed',
    occurredAt: '2026-09-10T10:00:00Z',
    user: { userId: 'u1', name: 'Ana Pérez' },
    versionLabel: 'v1.0',
    summary: 'Recepcionado → Asignado',
    ...parcial,
  };
}

const eventos = [
  evento({ eventId: '1' }),
  evento({
    eventId: '2',
    type: 'observation_added',
    occurredAt: '2026-09-15T09:00:00Z',
    user: { userId: 'u2', name: 'Luis Gómez' },
    summary: 'Faltan competencias específicas',
  }),
];

test('envía al servidor solo los filtros del contrato', () => {
  expect(
    consultaServidor({ tipo: 'assigned', desde: '2026-09-01', hasta: '', texto: 'x' }),
  ).toEqual({ type: 'assigned', from: '2026-09-01', to: '' });
});

test('filtra por texto en resumen, usuario y versión', () => {
  expect(filtrarPorTexto(eventos, 'competencias').map((e) => e.eventId)).toEqual(['2']);
  expect(filtrarPorTexto(eventos, 'ana').map((e) => e.eventId)).toEqual(['1']);
  expect(filtrarPorTexto(eventos, '  ')).toHaveLength(2);
});

test('ordena por fecha en ambos sentidos', () => {
  const desc = ordenarEventos(eventos, { key: 'fecha', direction: 'desc' });
  expect(desc.map((e) => e.eventId)).toEqual(['2', '1']);
  const asc = ordenarEventos(eventos, { key: 'fecha', direction: 'asc' });
  expect(asc.map((e) => e.eventId)).toEqual(['1', '2']);
});
