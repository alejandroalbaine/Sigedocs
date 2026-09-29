import { ContractError } from './contract.ts';
import { parseManagedUser, parseManagedUsers, parseUserRoles, userQuery } from './userContract.ts';

const usuario = {
  userId: '10000000-0000-4000-8000-000000000019',
  name: 'Coordinador de Programa',
  email: 'coord.programa@uapa.edu.do',
  isActive: true,
  schoolCode: null,
  roles: [{ roleId: 'r9', code: 'PROGRAM_COORDINATOR', name: 'Coordinador de Programa' }],
  createdAt: '2026-09-25T14:00:00.000Z',
};

test('valida el usuario del contrato (endpoints.md §2)', () => {
  expect(parseManagedUsers([usuario])).toEqual([usuario]);
});

test('acepta los alias de rol en español mientras dura REF-02', () => {
  expect(parseUserRoles([{ rolId: 'r1', codigo: 'ADMIN_SISTEMA', nombre: 'Admin' }])).toEqual([
    { roleId: 'r1', code: 'ADMIN_SISTEMA', name: 'Admin' },
  ]);
});

test('rechaza formas fuera de contrato', () => {
  expect(() => parseManagedUser({ ...usuario, isActive: 'true' })).toThrow(ContractError);
  expect(() => parseManagedUser({ ...usuario, roles: 'PROGRAM_COORDINATOR' })).toThrow(
    ContractError,
  );
  expect(() => parseManagedUser({ ...usuario, schoolCode: 5 })).toThrow(ContractError);
  expect(() => parseManagedUsers({ data: [usuario] })).toThrow(ContractError);
});

test('arma la query solo con los filtros informados', () => {
  expect(userQuery({})).toBe('limit=25');
  expect(
    userQuery({ isActive: false, roleCode: 'SYSTEM_ADMIN', search: '  ana ', cursor: 'c2' }),
  ).toBe('limit=25&isActive=false&roleCode=SYSTEM_ADMIN&search=ana&cursor=c2');
  expect(userQuery({ search: '   ' })).toBe('limit=25');
});
