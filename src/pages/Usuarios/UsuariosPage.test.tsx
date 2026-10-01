import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  adminSistema,
  especialista,
  json,
  problem,
  signedInBackend,
  stubApi,
  usuarioGestionado,
} from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

const coordinador = usuarioGestionado();
const propio = usuarioGestionado({
  userId: adminSistema.userId,
  name: adminSistema.name,
  email: adminSistema.email,
  roles: [{ roleId: 'r1', code: 'SYSTEM_ADMIN', name: 'Administrador del sistema' }],
});
const ruta = (userId: string) => `/api/v1/users/${userId}`;

function fila(correo: string) {
  const celda = within(screen.getByRole('table')).getByText(correo);
  const tr = celda.closest('tr');
  if (!tr) throw new Error(`Sin fila para ${correo}`);
  return within(tr);
}

test('sin users.manage no muestra la pantalla ni la opción del menú', async () => {
  renderApp(signedInBackend(especialista), '/usuarios');
  expect(await screen.findByText('Sin permiso')).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Usuarios y roles' })).not.toBeInTheDocument();
});

test('con el permiso transitorio usuarios.administrar muestra el menú y la pantalla', async () => {
  stubApi({ 'GET /api/v1/users': [coordinador] });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  expect(await screen.findByRole('link', { name: 'Usuarios y roles' })).toBeVisible();
  expect(await screen.findByText('coord.programa@uapa.edu.do')).toBeVisible();
});

test('si el servidor aún no implementa /users lo indica sin simular datos', async () => {
  stubApi({});
  renderApp(signedInBackend(adminSistema), '/usuarios');
  expect(await screen.findByText(/está en preparación/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Nuevo usuario' })).toBeDisabled();
});

test('los filtros viajan al servidor con los nombres del contrato', async () => {
  const llamadas = stubApi({ 'GET /api/v1/users': [coordinador] });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await screen.findByText('coord.programa@uapa.edu.do');
  await userEvent.selectOptions(screen.getByLabelText('Rol'), 'Especialista curricular');
  await userEvent.selectOptions(screen.getByLabelText('Estado'), 'Inactivos');
  await userEvent.type(screen.getByLabelText('Buscar'), 'ana');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await waitFor(() => {
    const url = llamadas.at(-1)?.url;
    expect(url?.searchParams.get('roleCode')).toBe('CURRICULUM_SPECIALIST');
    expect(url?.searchParams.get('isActive')).toBe('false');
    expect(url?.searchParams.get('search')).toBe('ana');
    expect(url?.searchParams.get('limit')).toBe('25');
  });
});

test('pagina con el cursor que devuelve el servidor', async () => {
  const llamadas = stubApi({
    'GET /api/v1/users': (_init: RequestInit, url: URL) =>
      url.searchParams.get('cursor')
        ? json({ data: [propio], meta: { pagination: { nextCursor: null, limit: 25 } } })
        : json({ data: [coordinador], meta: { pagination: { nextCursor: 'c2', limit: 25 } } }),
  });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await screen.findByText('coord.programa@uapa.edu.do');
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(await screen.findByText('Página 2')).toBeVisible();
  expect(llamadas.at(-1)?.url.searchParams.get('cursor')).toBe('c2');
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
});

test('crea un usuario validando antes de enviar', async () => {
  const llamadas = stubApi({
    'GET /api/v1/users': [],
    'POST /api/v1/users': () =>
      json({ data: usuarioGestionado({ name: 'Ana Pérez', email: 'ana.perez@uapa.edu.do' }) }, 201),
  });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
  const dialogo = within(screen.getByRole('dialog'));
  await userEvent.type(dialogo.getByLabelText('Nombre completo'), 'Ana Pérez');
  await userEvent.type(dialogo.getByLabelText('Correo institucional'), 'ana@gmail.com');
  await userEvent.type(dialogo.getByLabelText('Contraseña inicial'), 'corta');
  await userEvent.click(dialogo.getByRole('button', { name: 'Crear usuario' }));
  expect(dialogo.getByText('Use un correo institucional @uapa.edu.do.')).toBeVisible();
  expect(dialogo.getByText('La contraseña debe tener entre 8 y 128 caracteres.')).toBeVisible();
  expect(dialogo.getByText('Asigne al menos un rol.')).toBeVisible();
  expect(llamadas.some((llamada) => llamada.key === 'POST /api/v1/users')).toBe(false);

  await userEvent.clear(dialogo.getByLabelText('Correo institucional'));
  await userEvent.type(dialogo.getByLabelText('Correo institucional'), 'Ana.Perez@uapa.edu.do');
  await userEvent.type(dialogo.getByLabelText('Contraseña inicial'), '-segura-2026');
  await userEvent.click(dialogo.getByLabelText('Especialista curricular'));
  await userEvent.click(dialogo.getByRole('button', { name: 'Crear usuario' }));
  expect(await screen.findByText('Usuario Ana Pérez creado.')).toBeVisible();
  expect(llamadas.find((llamada) => llamada.key === 'POST /api/v1/users')?.body).toEqual({
    name: 'Ana Pérez',
    email: 'ana.perez@uapa.edu.do',
    password: 'corta-segura-2026',
    roleCodes: ['CURRICULUM_SPECIALIST'],
  });
});

test('un correo duplicado (409) se señala en el campo', async () => {
  stubApi({
    'GET /api/v1/users': [],
    'POST /api/v1/users': () => problem(409, 'CONFLICT'),
  });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
  const dialogo = within(screen.getByRole('dialog'));
  await userEvent.type(dialogo.getByLabelText('Nombre completo'), 'Ana Pérez');
  await userEvent.type(dialogo.getByLabelText('Correo institucional'), 'ana@uapa.edu.do');
  await userEvent.type(dialogo.getByLabelText('Contraseña inicial'), 'clave-de-prueba');
  await userEvent.click(dialogo.getByLabelText('Especialista curricular'));
  await userEvent.click(dialogo.getByRole('button', { name: 'Crear usuario' }));
  expect(
    await dialogo.findByText('Ya existe un usuario con ese correo institucional.'),
  ).toBeVisible();
  expect(dialogo.getByText('Este correo ya está registrado.')).toBeVisible();
});

test('el Director de Escuela exige código de escuela', async () => {
  stubApi({ 'GET /api/v1/users': [] });
  const backend = signedInBackend(adminSistema);
  backend.on('GET /api/v1/roles', () =>
    json({ data: [{ rolId: 'r8', codigo: 'DIR_ESCUELA', nombre: 'Director de Escuela' }] }),
  );
  renderApp(backend, '/usuarios');
  await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
  const dialogo = within(screen.getByRole('dialog'));
  await userEvent.click(dialogo.getByLabelText('Director de Escuela'));
  await userEvent.click(dialogo.getByRole('button', { name: 'Crear usuario' }));
  expect(dialogo.getByText('El Director de Escuela necesita un código de escuela.')).toBeVisible();
});

test('edita solo los datos que cambiaron', async () => {
  const llamadas = stubApi({
    'GET /api/v1/users': [coordinador],
    [`PATCH ${ruta(coordinador.userId)}`]: usuarioGestionado({ name: 'Coordinadora de Programa' }),
  });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await screen.findByText('coord.programa@uapa.edu.do');
  await userEvent.click(fila(coordinador.email).getByRole('button', { name: /Editar/ }));
  const dialogo = within(screen.getByRole('dialog'));
  await userEvent.clear(dialogo.getByLabelText('Nombre completo'));
  await userEvent.type(dialogo.getByLabelText('Nombre completo'), 'Coordinadora de Programa');
  await userEvent.click(dialogo.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('Datos de Coordinadora de Programa actualizados.')).toBeVisible();
  expect(llamadas.find((llamada) => llamada.key.startsWith('PATCH'))?.body).toEqual({
    name: 'Coordinadora de Programa',
  });
});

test('desactiva con confirmación y avisa que se cierran sus sesiones', async () => {
  const llamadas = stubApi({
    'GET /api/v1/users': [coordinador],
    [`PATCH ${ruta(coordinador.userId)}`]: usuarioGestionado({ isActive: false }),
  });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await screen.findByText('coord.programa@uapa.edu.do');
  await userEvent.click(fila(coordinador.email).getByRole('button', { name: /Desactivar/ }));
  const dialogo = within(screen.getByRole('dialog'));
  expect(dialogo.getByText(/se cerrarán sus sesiones abiertas/)).toBeVisible();
  await userEvent.click(dialogo.getByRole('button', { name: 'Desactivar cuenta' }));
  expect(await screen.findByText('Coordinador de Programa quedó inactivo.')).toBeVisible();
  expect(llamadas.find((llamada) => llamada.key.startsWith('PATCH'))?.body).toEqual({
    isActive: false,
  });
});

test('reemplaza los roles con los códigos del contrato', async () => {
  const llamadas = stubApi({
    'GET /api/v1/users': [coordinador],
    [`PUT ${ruta(coordinador.userId)}/roles`]: usuarioGestionado(),
  });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await screen.findByText('coord.programa@uapa.edu.do');
  await userEvent.click(fila(coordinador.email).getByRole('button', { name: /Roles de/ }));
  const dialogo = within(screen.getByRole('dialog'));
  await userEvent.click(dialogo.getByLabelText('Vicerrectoría Académica'));
  await userEvent.click(dialogo.getByRole('button', { name: 'Guardar roles' }));
  expect(await screen.findByText('Roles de Coordinador de Programa actualizados.')).toBeVisible();
  expect(llamadas.find((llamada) => llamada.key.startsWith('PUT'))?.body).toEqual({
    roleCodes: ['PROGRAM_COORDINATOR', 'VP_ACADEMIC'],
  });
});

test('nadie cambia sus propios roles ni desactiva su cuenta', async () => {
  stubApi({ 'GET /api/v1/users': [propio, coordinador] });
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await screen.findByText('coord.programa@uapa.edu.do');
  const miFila = fila(adminSistema.email);
  expect(miFila.getByRole('button', { name: /Roles de/ })).toBeDisabled();
  expect(miFila.getByRole('button', { name: /Desactivar/ })).toBeDisabled();
  expect(miFila.getByRole('button', { name: /Editar/ })).toBeEnabled();
});
