import { screen } from '@testing-library/react';
import { especialista, fakeBackend, problem, responses } from '../../test/backend.ts';
import { iniciarSesion } from '../../test/login.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('muestra el estado del servicio consultado al backend', async () => {
  renderApp(fakeBackend(), '/login');
  expect(await screen.findByText('Servicio disponible')).toBeInTheDocument();
});

test('un login correcto abre el panel con la identidad del backend', async () => {
  const backend = fakeBackend({
    'POST /api/v1/sessions': () => responses.login(especialista),
  });
  renderApp(backend, '/login');

  await iniciarSesion('especialista.curricular@uapa.edu.do', 'Clave-segura-1');

  expect(
    await screen.findByRole('heading', { name: 'Bienvenido/a, Especialista Curricular' }),
  ).toBeInTheDocument();
  expect(backend.calls).toContain('POST /api/v1/sessions');
});

test('credenciales incorrectas muestran el mensaje del código y enfocan la contraseña', async () => {
  renderApp(
    fakeBackend({ 'POST /api/v1/sessions': () => problem(401, 'CREDENCIALES_INVALIDAS') }),
    '/login',
  );
  await iniciarSesion('especialista.curricular@uapa.edu.do', 'Clave-incorrecta');

  expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  expect(screen.getByLabelText('Contraseña')).toHaveFocus();
});

test('una cuenta sin rol recibe el mensaje específico del backend', async () => {
  renderApp(
    fakeBackend({ 'POST /api/v1/sessions': () => problem(403, 'USUARIO_SIN_ROL') }),
    '/login',
  );
  await iniciarSesion('sin.permisos@uapa.edu.do', 'Clave-segura-1');
  expect(await screen.findByRole('alert')).toHaveTextContent(/no tiene un rol asignado/);
});

test('valida el correo institucional antes de llamar al backend', async () => {
  const backend = fakeBackend();
  renderApp(backend, '/login');
  await iniciarSesion('persona@gmail.com', 'Clave-segura-1');

  const email = screen.getByLabelText('Correo institucional');
  expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(email).toHaveFocus();
  expect(screen.getByText('Use su cuenta institucional @uapa.edu.do.')).toBeInTheDocument();
  expect(backend.calls).not.toContain('POST /api/v1/sessions');
});

test('los campos rechazados por el backend quedan marcados', async () => {
  renderApp(
    fakeBackend({
      'POST /api/v1/sessions': () =>
        problem(422, 'VALIDACION_FALLIDA', [{ campo: 'email', codigo: 'FORMATO_INVALIDO' }]),
    }),
    '/login',
  );
  await iniciarSesion('especialista.curricular@uapa.edu.do', 'Clave-segura-1');

  expect(await screen.findByRole('alert')).toHaveTextContent('Revise: correo institucional.');
  expect(screen.getByLabelText('Correo institucional')).toHaveAttribute('aria-invalid', 'true');
});
