import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { especialista, fakeBackend, problem, responses, signedInBackend } from './test/backend.ts';
import { iniciarSesion } from './test/login.ts';
import { renderApp } from './test/renderApp.tsx';

test('sin sesión, una ruta interna lleva al acceso', async () => {
  renderApp(fakeBackend(), '/');
  expect(await screen.findByRole('heading', { name: 'Acceso institucional' })).toBeInTheDocument();
});

test('después del login vuelve a la ruta que se pidió', async () => {
  const backend = fakeBackend({
    'POST /api/v1/sessions': () => responses.login(especialista),
  });
  const { router } = renderApp(backend, '/ruta-inexistente');

  await iniciarSesion('especialista.curricular@uapa.edu.do', 'Clave-segura-1');

  expect(await screen.findByText('Página no encontrada')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/ruta-inexistente');
});

test('con sesión activa, /login redirige al panel', async () => {
  renderApp(signedInBackend(especialista), '/login');
  expect(
    await screen.findByRole('heading', { name: 'Bienvenido/a, Especialista Curricular' }),
  ).toBeInTheDocument();
});

test('si el backend no responde al verificar la sesión, ofrece reintentar', async () => {
  const backend = fakeBackend({
    'GET /api/v1/users/current': () => problem(503, 'SERVICIO_NO_DISPONIBLE'),
  });
  renderApp(backend, '/');

  expect(await screen.findByRole('alert')).toHaveTextContent(/no está disponible/);
  backend.on('GET /api/v1/users/current', () => responses.currentUser(especialista));
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(
    await screen.findByRole('heading', { name: 'Bienvenido/a, Especialista Curricular' }),
  ).toBeInTheDocument();
});
