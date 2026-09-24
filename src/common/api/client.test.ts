import { especialista, json, problem, responses } from '../../test/backend.ts';
import { createApiClient, type FetchImpl } from './client.ts';
import { ApiError } from './errors.ts';

const credentials = { email: 'prueba@uapa.edu.do', password: 'solo-para-pruebas', remember: true };

function client(fetchImpl: FetchImpl, options: { baseUrl?: string; timeoutMs?: number } = {}) {
  return createApiClient({ baseUrl: '', ...options, fetchImpl });
}

test('usa las rutas del backend, sus métodos y envía la cookie de sesión', async () => {
  const seen: string[] = [];
  const api = client(async (url, init) => {
    seen.push(`${init.method ?? ''} ${url}`);
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('Accept')).toMatch(/application\/problem\+json/);
    if (url.endsWith('/sessions')) return responses.login(especialista);
    if (url.endsWith('/current') && init.method === 'DELETE') return responses.logout();
    if (url.endsWith('/current')) return responses.currentUser(especialista);
    if (url.endsWith('/roles')) return responses.roles();
    return responses.status();
  });

  await api.request('status');
  await api.request('login', credentials);
  await api.request('currentUser');
  await api.request('logout');
  await api.request('roles');

  expect(seen).toEqual([
    'GET /api/v1/status',
    'POST /api/v1/sessions',
    'GET /api/v1/users/current',
    'DELETE /api/v1/sessions/current',
    'GET /api/v1/roles',
  ]);
});

test('aplica el origen configurado a las rutas', async () => {
  const urls: string[] = [];
  const api = client(
    async (url) => {
      urls.push(url);
      return responses.status();
    },
    { baseUrl: ' https://api.example.test:8443/ ' },
  );
  await api.request('status');
  expect(urls).toEqual(['https://api.example.test:8443/api/v1/status']);
});

test('rechaza orígenes inválidos antes de enviar datos', async () => {
  const invalid = [
    'localhost:3000',
    '/api',
    'ftp://example.test',
    'https://usuario:clave@example.test',
    'https://example.test/api/v1',
    'https://example.test?token=privado',
    'https://example.test#fragmento',
  ];
  for (const baseUrl of invalid) {
    const api = client(
      () => {
        throw new Error('No debe enviar una petición');
      },
      { baseUrl },
    );
    await expect(api.request('login', credentials)).rejects.toBeInstanceOf(ApiError);
  }
});

test('envía el login como JSON y devuelve la identidad validada', async () => {
  const api = client(async (_url, init) => {
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual(credentials);
    return responses.login(especialista);
  });
  const { user } = await api.request('login', credentials);
  expect(user.name).toBe('Especialista Curricular');
  expect(user.unit).toBeNull();
  expect(user.permissions).toContain('expedientes.aprobar');
});

test('una respuesta fuera de contrato falla con un mensaje claro, no con un TypeError', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // Forma que devolvía el servidor temporal eliminado: plana y en español.
  const api = client(async () =>
    json({ data: { usuarioId: 'x', nombre: 'Mercedes', permisos: ['expedientes.consultar'] } }),
  );
  await expect(api.request('login', credentials)).rejects.toThrow(/respuesta no válida/);
  expect(consoleError).toHaveBeenCalledWith('[login]', expect.stringMatching(/fuera de contrato/));
  consoleError.mockRestore();
});

test('elige el mensaje por codigo y no expone detail del servidor', async () => {
  const api = client(async () => problem(401, 'CREDENCIALES_INVALIDAS'));
  const error = await api.request('login', credentials).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ code: 'CREDENCIALES_INVALIDAS', status: 401 });
  expect((error as ApiError).message).toBe('Correo o contraseña incorrectos.');
});

test('traduce los códigos de sesión y de cuenta del backend', async () => {
  const cases: [number, string, RegExp][] = [
    [401, 'USUARIO_INACTIVO', /inactiva/],
    [403, 'USUARIO_SIN_ROL', /rol asignado/],
    [401, 'SESION_EXPIRADA', /expiró/],
    [503, 'SERVICIO_NO_DISPONIBLE', /no está disponible/],
  ];
  for (const [status, codigo, message] of cases) {
    const api = client(async () => problem(status, codigo));
    await expect(api.request('currentUser')).rejects.toThrow(message);
  }
});

test('un error de validación identifica los campos que fallaron', async () => {
  const api = client(async () =>
    problem(422, 'VALIDACION_FALLIDA', [
      { campo: 'email', codigo: 'FORMATO_INVALIDO', mensaje: 'texto del servidor' },
      { campo: 'password', codigo: 'REQUERIDO', mensaje: 'texto del servidor' },
    ]),
  );
  const error = (await api
    .request('login', credentials)
    .catch((caught: unknown) => caught)) as ApiError;
  expect(error.message).toBe('Revise: correo institucional, contraseña.');
  expect(error.fieldErrors).toEqual([
    { field: 'email', code: 'FORMATO_INVALIDO' },
    { field: 'password', code: 'REQUERIDO' },
  ]);
});

test('un código desconocido usa un mensaje seguro según el estado HTTP', async () => {
  const api = client(async () => problem(500, 'DETALLE_INTERNO'));
  await expect(api.request('status')).rejects.toThrow(
    'El servicio no está disponible en este momento. Inténtelo más tarde.',
  );
});

test('204 no intenta interpretar un cuerpo vacío', async () => {
  const api = client(async () => responses.logout());
  expect(await api.request('logout')).toBeNull();
});

test('rechaza una respuesta exitosa que no contiene data', async () => {
  const api = client(async () => json({ user: especialista }));
  await expect(api.request('currentUser')).rejects.toThrow(/respuesta no válida/);
});

test('un fallo de red muestra un mensaje claro y no reintenta', async () => {
  let calls = 0;
  const api = client(() => {
    calls++;
    return Promise.reject(new TypeError('Failed to fetch'));
  });
  await expect(api.request('login', credentials)).rejects.toThrow(/No se pudo conectar/);
  expect(calls).toBe(1);
});

test('limita la espera cuando el servidor no responde', async () => {
  const api = client(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          'abort',
          () => {
            reject(new Error('abortado'));
          },
          { once: true },
        );
      }),
    { timeoutMs: 5 },
  );
  await expect(api.request('status')).rejects.toThrow(/tardó demasiado/);
});
