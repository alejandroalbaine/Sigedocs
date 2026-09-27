import { dossier } from '../../test/backend.ts';
import { ContractError } from './contract.ts';
import {
  parseAvailableTransitions,
  parseDossier,
  parseHistory,
  parseSpecialists,
  parseStateRef,
  parseUserRef,
} from './dossierContract.ts';

test('acepta un Dossier con la forma exacta del contrato', () => {
  expect(parseDossier(dossier())).toEqual(dossier());
});

test('rechaza un Dossier fuera de contrato en lugar de fallar en silencio', () => {
  expect(() => parseDossier({ ...dossier(), academicLevel: 'graduate' })).toThrow(ContractError);
  expect(() => parseDossier({ ...dossier(), currentVersion: {} })).toThrow(ContractError);
});

test('los estados y usuarios aceptan código o objeto', () => {
  expect(parseStateRef('IN_REVIEW', 's')).toEqual({ code: 'IN_REVIEW', name: 'IN_REVIEW' });
  expect(parseStateRef({ code: 'FINAL', name: 'Definitivo' }, 's').name).toBe('Definitivo');
  expect(parseUserRef('Ana', 'u')).toEqual({ userId: null, name: 'Ana' });
  expect(parseUserRef({ userId: 'u1', name: 'Ana' }, 'u').userId).toBe('u1');
});

test('las transiciones exigen requiresObservation booleano', () => {
  const base = { transitionId: 't', code: 'ASSIGN', name: 'Asignar', toState: 'ASSIGNED' };
  expect(parseAvailableTransitions([{ ...base, requiresObservation: false }])).toHaveLength(1);
  expect(() => parseAvailableTransitions([base])).toThrow(ContractError);
});

test('el primer registro del historial puede no tener estado anterior', () => {
  const [entrada] = parseHistory([
    {
      historyId: 'h',
      transition: { code: 'ASSIGN', name: 'Asignar' },
      fromState: null,
      toState: 'ASSIGNED',
      versionLabel: 'v1.0',
      user: { userId: 'u', name: 'Dirección' },
      observation: null,
      occurredAt: '2026-09-27T10:00:00.000Z',
    },
  ]);
  expect(entrada?.fromState).toBeNull();
});

test('de /users conserva solo especialistas cuando llegan roles', () => {
  const lista = parseSpecialists([
    { userId: 'a', name: 'Especialista', roles: ['CURRICULUM_SPECIALIST'] },
    { userId: 'b', name: 'Legado', roles: ['ESPECIALISTA_CURRICULAR'] },
    { userId: 'c', name: 'VRA', roles: ['VRA'] },
  ]);
  expect(lista.map((usuario) => usuario.userId)).toEqual(['a', 'b']);
});
