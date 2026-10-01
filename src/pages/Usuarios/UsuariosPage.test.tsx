import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminSistema, especialista, signedInBackend } from '../../test/backend.ts';
import { json, problem, stubFetch } from '../../test/fetch.ts';
import { renderApp } from '../../test/renderApp.tsx';

const rolAdmin = { roleId: 'r1', code: 'ADMIN_SISTEMA', name: 'Administrador del sistema' };
const rolEspecialista = {
  roleId: 'r2',
  code: 'ESPECIALISTA_CURRICULAR',
  name: 'Especialista curricular',
};
const rolDirector = { roleId: 'r4', code: 'SCHOOL_DIRECTOR', name: 'Director de escuela' };

const ana = {
  userId: '20000000-0000-4000-8000-000000000001',
  name: 'Ana Pérez',
  email: 'ana.perez@uapa.edu.do',
  isActive: true,
  schoolCode: null,
  roles: [rolEspecialista],
  createdAt: '2026-09-25T14:00:00Z',
};
const luis = {
  ...ana,
  userId: '20000000-0000-4000-8000-000000000002',
  name: 'Luis Gómez',
  email: 'luis.gomez@uapa.edu.do',
  isActive: false,
  roles: [],
};
// El administrador conectado también aparece en la lista (no puede cambiarse a sí mismo).
const yo = { ...ana, userId: adminSistema.userId, name: adminSistema.name, roles: [rolAdmin] };

function backendDeUsuarios(lista = [ana, luis, yo]) {
  return stubFetch({
    'GET /api/v1/roles': () => json({ data: [rolAdmin, rolEspecialista, rolDirector] }),
    'GET /api/v1/users': () =>
      json({ data: lista, meta: { pagination: { nextCursor: null, limit: 25 } } }),
  });
}

function fila(nombre: string) {
  return within(screen.getByRole('row', { name: new RegExp(nombre) }));
}

async function abrirUsuarios() {
  renderApp(signedInBackend(adminSistema), '/usuarios');
  await screen.findByRole('heading', { name: 'Usuarios y roles' });
}

test('exige users.manage', async () => {
  renderApp(signedInBackend(especialista), '/usuarios');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('lista los usuarios con su estado y sus roles', async () => {
  backendDeUsuarios();
  await abrirUsuarios();

  expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
  expect(fila('Ana Pérez').getByText('Especialista curricular')).toBeInTheDocument();
  expect(fila('Ana Pérez').getByText('Activo')).toBeInTheDocument();
  expect(fila('Luis Gómez').getByText('Inactivo')).toBeInTheDocument();
  expect(fila('Luis Gómez').getByText('Sin rol')).toBeInTheDocument();
});

test('muestra el estado vacío cuando no hay coincidencias', async () => {
  backendDeUsuarios([]);
  await abrirUsuarios();
  expect(await screen.findByText(/No hay usuarios que coincidan/)).toBeInTheDocument();
});

test('si la consulta falla, lo informa sin inventar usuarios', async () => {
  stubFetch({ 'GET /api/v1/users': () => problem(503, 'SERVICIO_NO_DISPONIBLE') });
  await abrirUsuarios();
  expect(await screen.findByRole('alert')).toHaveTextContent(/servicio no está disponible/);
  expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
});

test('filtra por texto, estado y rol enviando solo los filtros con valor', async () => {
  const backend = backendDeUsuarios();
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.type(screen.getByLabelText('Buscar'), ' ana ');
  await userEvent.selectOptions(screen.getByLabelText('Estado'), 'Inactivos');
  await userEvent.selectOptions(screen.getByLabelText('Rol'), 'Especialista curricular');
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

  await waitFor(() => {
    expect(backend.calls).toContain(
      'GET /api/v1/users?limit=25&search=ana&isActive=false&roleCode=ESPECIALISTA_CURRICULAR',
    );
  });

  await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
  await waitFor(() => {
    expect(backend.calls.at(-1)).toBe('GET /api/v1/users?limit=25');
  });
});

test('"Cargar más" pide la página siguiente con su cursor', async () => {
  const backend = stubFetch({
    'GET /api/v1/roles': () => json({ data: [rolAdmin] }),
    'GET /api/v1/users': ({ url }) =>
      url.searchParams.get('cursor')
        ? json({ data: [luis], meta: { pagination: { nextCursor: null, limit: 25 } } })
        : json({ data: [ana], meta: { pagination: { nextCursor: 'abc', limit: 25 } } }),
  });
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
  expect(await screen.findByText('Luis Gómez')).toBeInTheDocument();
  expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
  expect(backend.calls).toContain('GET /api/v1/users?limit=25&cursor=abc');
  expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
});

test('crea un usuario con el cuerpo exacto del contrato y lo agrega a la lista', async () => {
  const nuevo = { ...ana, userId: 'nuevo', name: 'Marta Díaz', email: 'marta@uapa.edu.do' };
  const backend = backendDeUsuarios();
  backend.on('POST /api/v1/users', () => json({ data: nuevo }, 201));
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
  await userEvent.type(screen.getByLabelText('Nombre completo'), 'Marta Díaz');
  await userEvent.type(screen.getByLabelText('Correo institucional'), 'marta@uapa.edu.do');
  await userEvent.type(screen.getByLabelText('Contraseña inicial'), 'ClaveSegura1');
  await userEvent.click(screen.getByLabelText('Especialista curricular'));
  await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

  expect(await screen.findByText('Marta Díaz fue creado.')).toBeInTheDocument();
  expect(backend.bodies).toEqual([
    {
      name: 'Marta Díaz',
      email: 'marta@uapa.edu.do',
      password: 'ClaveSegura1',
      roleCodes: ['ESPECIALISTA_CURRICULAR'],
    },
  ]);
  expect(fila('Marta Díaz').getByText('marta@uapa.edu.do')).toBeInTheDocument();
});

test('al crear valida los campos y exige la escuela para Director de Escuela', async () => {
  const backend = backendDeUsuarios();
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));
  expect(screen.getByText('Escriba el nombre completo.')).toBeInTheDocument();
  expect(screen.getByText('Escriba un correo válido.')).toBeInTheDocument();
  expect(screen.getByText('Use al menos 8 caracteres.')).toBeInTheDocument();
  expect(screen.getByText('Seleccione al menos un rol.')).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText('Nombre completo'), 'Marta Díaz');
  await userEvent.type(screen.getByLabelText('Correo institucional'), 'marta@uapa.edu.do');
  await userEvent.type(screen.getByLabelText('Contraseña inicial'), 'ClaveSegura1');
  await userEvent.click(screen.getByLabelText('Director de escuela'));
  await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

  expect(screen.getByText(/La escuela es obligatoria/)).toBeInTheDocument();
  expect(backend.bodies).toHaveLength(0);
});

test('un correo duplicado (409) se marca en el campo', async () => {
  const backend = backendDeUsuarios();
  backend.on('POST /api/v1/users', () => problem(409, 'CONFLICT'));
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
  await userEvent.type(screen.getByLabelText('Nombre completo'), 'Otra Ana');
  await userEvent.type(screen.getByLabelText('Correo institucional'), 'ana.perez@uapa.edu.do');
  await userEvent.type(screen.getByLabelText('Contraseña inicial'), 'ClaveSegura1');
  await userEvent.click(screen.getByLabelText('Especialista curricular'));
  await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

  expect(await screen.findByText('Ya existe un usuario con este correo.')).toBeInTheDocument();
});

test('edita nombre y escuela con PATCH', async () => {
  const backend = backendDeUsuarios();
  backend.on('PATCH /api/v1/users/' + ana.userId, () =>
    json({ data: { ...ana, name: 'Ana P. Pérez' } }),
  );
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.click(screen.getByRole('button', { name: 'Editar Ana Pérez' }));
  const nombre = screen.getByLabelText('Nombre completo');
  await userEvent.clear(nombre);
  await userEvent.type(nombre, 'Ana P. Pérez');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

  expect(await screen.findByText('Los datos de Ana P. Pérez se actualizaron.')).toBeVisible();
  expect(backend.bodies).toEqual([{ name: 'Ana P. Pérez' }]);
});

test('desactiva y activa usuarios; no permite cambiarse a sí mismo', async () => {
  const backend = backendDeUsuarios();
  backend.on('PATCH /api/v1/users/' + ana.userId, () =>
    json({ data: { ...ana, isActive: false } }),
  );
  backend.on('PATCH /api/v1/users/' + luis.userId, () =>
    json({ data: { ...luis, isActive: true } }),
  );
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  expect(screen.getByRole('button', { name: `Desactivar a ${adminSistema.name}` })).toBeDisabled();
  expect(screen.getByRole('button', { name: `Roles de ${adminSistema.name}` })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Desactivar a Ana Pérez' }));
  expect(await screen.findByText('Ana Pérez fue desactivado.')).toBeInTheDocument();
  expect(fila('Ana Pérez').getByText('Inactivo')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Activar a Luis Gómez' }));
  expect(await screen.findByText('Luis Gómez fue activado.')).toBeInTheDocument();
  expect(backend.bodies).toEqual([{ isActive: false }, { isActive: true }]);
});

test('asigna roles reemplazando el conjunto completo', async () => {
  const backend = backendDeUsuarios();
  backend.on('PUT /api/v1/users/' + ana.userId + '/roles', () =>
    json({ data: { ...ana, roles: [rolEspecialista, rolAdmin] } }),
  );
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.click(screen.getByRole('button', { name: 'Roles de Ana Pérez' }));
  const dialogo = within(screen.getByRole('dialog'));
  expect(dialogo.getByLabelText('Especialista curricular')).toBeChecked();
  await userEvent.click(dialogo.getByLabelText('Administrador del sistema'));
  await userEvent.click(dialogo.getByRole('button', { name: 'Guardar roles' }));

  expect(await screen.findByText('Los roles de Ana Pérez se actualizaron.')).toBeVisible();
  expect(backend.bodies).toEqual([{ roleCodes: ['ESPECIALISTA_CURRICULAR', 'ADMIN_SISTEMA'] }]);
});

test('si el servidor niega el cambio de roles (403) lo informa y mantiene el diálogo', async () => {
  const backend = backendDeUsuarios();
  backend.on('PUT /api/v1/users/' + ana.userId + '/roles', () => problem(403, 'FORBIDDEN'));
  await abrirUsuarios();
  await screen.findByText('Ana Pérez');

  await userEvent.click(screen.getByRole('button', { name: 'Roles de Ana Pérez' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar roles' }),
  );

  expect(await screen.findByText('No tiene permiso para realizar esta acción.')).toBeVisible();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
