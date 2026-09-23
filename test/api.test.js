import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createApiClient } from '../public/api.js';

const json = (body, status = 200, contentType = 'application/json') => new Response(
  JSON.stringify(body),
  { status, headers: { 'Content-Type': contentType } }
);

test('usa las rutas definitivas, sus métodos y credenciales de sesión', async () => {
  const expected = [
    ['health', '/api/v1/status', 'GET'],
    ['login', '/api/v1/sessions', 'POST'],
    ['me', '/api/v1/users/current', 'GET'],
    ['logout', '/api/v1/sessions/current', 'DELETE']
  ];
  for (const [operation, path, method] of expected) {
    const client = createApiClient({
      fetchImpl: async (url, options) => {
        assert.equal(url, path);
        assert.equal(options.method, method);
        assert.equal(options.credentials, 'include');
        assert.match(options.headers.Accept, /application\/problem\+json/);
        return json({ data: { ok: true } });
      }
    });
    assert.deepEqual(await client.request(operation), { ok: true });
  }
});

test('aplica el origen configurado a todas las rutas', async () => {
  const urls = [];
  const client = createApiClient({
    baseUrl: ' https://api.example.test:8443/ ',
    fetchImpl: async (url) => {
      urls.push(url);
      return json({ data: {} });
    }
  });
  for (const operation of ['health', 'login', 'me', 'logout']) await client.request(operation);
  assert.deepEqual(urls, [
    'https://api.example.test:8443/api/v1/status',
    'https://api.example.test:8443/api/v1/sessions',
    'https://api.example.test:8443/api/v1/users/current',
    'https://api.example.test:8443/api/v1/sessions/current'
  ]);
});

test('envía los datos de login como JSON y devuelve únicamente data', async () => {
  const credentials = { email: 'prueba@uapa.edu.do', password: 'solo-para-pruebas', remember: true };
  const client = createApiClient({
    fetchImpl: async (url, options) => {
      assert.equal(url, '/api/v1/sessions');
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(options.body), credentials);
      return json({ data: { nombre: 'Prueba' }, meta: { requestId: 'abc' } });
    }
  });
  assert.deepEqual(await client.request('login', credentials), { nombre: 'Prueba' });
});

test('rechaza orígenes inválidos antes de enviar datos', async () => {
  const invalid = [
    null, 'localhost:3000', '/api', 'ftp://example.test',
    'https://usuario:clave@example.test', 'https://example.test/api/v1',
    'https://example.test?token=privado', 'https://example.test#fragmento'
  ];
  for (const baseUrl of invalid) {
    const client = createApiClient({
      baseUrl,
      fetchImpl: async () => assert.fail('No debe enviar una petición')
    });
    await assert.rejects(client.request('login', {}), ApiError);
  }
});

test('elige el mensaje por codigo y no expone detail del servidor', async () => {
  const client = createApiClient({
    fetchImpl: async () => json({
      type: '/problemas/credenciales-invalidas',
      title: 'Texto modificable',
      status: 401,
      detail: 'SQL password=secreto',
      codigo: 'CREDENCIALES_INVALIDAS'
    }, 401, 'application/problem+json')
  });
  await assert.rejects(client.request('login'), (error) => {
    assert.equal(error.code, 'CREDENCIALES_INVALIDAS');
    assert.equal(error.message, 'Correo o contraseña incorrectos.');
    assert.doesNotMatch(error.message, /SQL|password|secreto/);
    return true;
  });
});

test('un error de validación identifica los campos que fallaron', async () => {
  const client = createApiClient({
    fetchImpl: async () => json({
      status: 422,
      codigo: 'VALIDACION_FALLIDA',
      errores: [
        { campo: 'email', codigo: 'FORMATO_INVALIDO', mensaje: 'texto del servidor' },
        { campo: 'password', codigo: 'REQUERIDO', mensaje: 'texto del servidor' }
      ]
    }, 422, 'application/problem+json')
  });
  await assert.rejects(client.request('login'), (error) => {
    assert.equal(error.message, 'Revise: correo institucional, contraseña.');
    assert.deepEqual(error.fieldErrors, [
      { field: 'email', code: 'FORMATO_INVALIDO' },
      { field: 'password', code: 'REQUERIDO' }
    ]);
    return true;
  });
});

test('un código desconocido usa un mensaje seguro según el estado HTTP', async () => {
  const client = createApiClient({
    fetchImpl: async () => json({ codigo: 'DETALLE_INTERNO', detail: 'traza privada' }, 500, 'application/problem+json')
  });
  await assert.rejects(client.request('health'), (error) => {
    assert.equal(error.message, 'El servicio no está disponible en este momento. Inténtelo más tarde.');
    assert.doesNotMatch(error.message, /traza|privada/);
    return true;
  });
});

test('204 no intenta interpretar un cuerpo JSON vacío', async () => {
  const client = createApiClient({
    fetchImpl: async () => new Response(null, { status: 204 })
  });
  assert.equal(await client.request('logout'), null);
});

test('rechaza una respuesta exitosa que no contiene data', async () => {
  const client = createApiClient({ fetchImpl: async () => json({ user: {} }) });
  await assert.rejects(client.request('me'), /respuesta no válida/);
});

test('un fallo de red muestra un mensaje claro y no reintenta automáticamente', async () => {
  let calls = 0;
  const client = createApiClient({
    fetchImpl: async () => {
      calls++;
      throw new TypeError('Failed to fetch');
    }
  });
  await assert.rejects(client.request('login', {}), /No se pudo conectar/);
  assert.equal(calls, 1);
});

test('limita la espera cuando el servidor no responde', async () => {
  const client = createApiClient({
    timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('abortado')), { once: true });
    })
  });
  await assert.rejects(client.request('health'), /tardó demasiado/);
});

test('rechaza una operación no registrada', async () => {
  const client = createApiClient({ fetchImpl: async () => assert.fail('No debe enviar una petición') });
  await assert.rejects(client.request('constructor'), /operación solicitada/);
});
