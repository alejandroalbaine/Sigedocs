import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  adminSistema,
  especialista,
  problem,
  signedInBackend,
  sinPermisos,
} from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

function menu() {
  return within(screen.getByRole('complementary', { name: 'Menú principal' }));
}

test('la navegación muestra solo los módulos permitidos, nunca por nombre de rol', async () => {
  renderApp(signedInBackend(especialista), '/');
  await screen.findByRole('heading', { name: /Bienvenido/ });

  expect(menu().getByRole('link', { name: /Detalle y revisión/ })).toBeInTheDocument();
  expect(menu().getByRole('link', { name: /Observaciones/ })).toBeInTheDocument();
  expect(menu().queryByRole('link', { name: /Historial/ })).not.toBeInTheDocument();
});

test('la auditoría habilita el historial', async () => {
  renderApp(signedInBackend(adminSistema), '/');
  await screen.findByRole('heading', { name: /Bienvenido/ });

  expect(menu().getByRole('link', { name: /Historial y trazabilidad/ })).toBeInTheDocument();
  expect(menu().queryByRole('link', { name: /Detalle y revisión/ })).not.toBeInTheDocument();
});

test('sin permisos solo queda el panel principal', async () => {
  renderApp(signedInBackend(sinPermisos), '/');
  await screen.findByRole('heading', { name: /Bienvenido/ });
  expect(menu().getAllByRole('listitem')).toHaveLength(1);
});

test('el menú de perfil muestra los datos y el nombre del rol', async () => {
  renderApp(signedInBackend(especialista), '/');
  await userEvent.click(await screen.findByRole('button', { name: /Perfil y sesión/ }));

  expect(screen.getByText('especialista.curricular@uapa.edu.do')).toBeVisible();
  expect(await screen.findAllByText('Especialista curricular')).not.toHaveLength(0);
});

test('cerrar sesión vuelve al acceso', async () => {
  const backend = signedInBackend(especialista);
  renderApp(backend, '/');
  await userEvent.click(await screen.findByRole('button', { name: /Perfil y sesión/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

  expect(await screen.findByRole('heading', { name: 'Acceso institucional' })).toBeInTheDocument();
  expect(backend.calls).toContain('DELETE /api/v1/sessions/current');
});

test('si cerrar sesión falla, lo informa y no finge que se cerró', async () => {
  const backend = signedInBackend(especialista);
  backend.on('DELETE /api/v1/sessions/current', () => problem(503, 'SERVICIO_NO_DISPONIBLE'));
  renderApp(backend, '/');
  await userEvent.click(await screen.findByRole('button', { name: /Perfil y sesión/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/La sesión sigue abierta/);
  expect(screen.getByRole('heading', { name: /Bienvenido/ })).toBeInTheDocument();
});
