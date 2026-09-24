import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  especialista,
  fakeBackend,
  problem,
  signedInBackend,
  type FakeBackend,
} from '../../test/backend.ts';
import { ApiProvider } from '../api/ApiProvider.tsx';
import { Can } from './Can.tsx';
import { roleLabels, useSession } from './SessionContext.ts';
import { SessionProvider } from './SessionProvider.tsx';

function Probe() {
  const { status, user, roleNames, logout, error } = useSession();
  return (
    <div>
      <p>estado: {status}</p>
      {error && <p>error: {error.message}</p>}
      {user && (
        <>
          <p>nombre: {user.name}</p>
          <p>roles: {roleLabels(user, roleNames)}</p>
          <p>permisos: {user.permissions.join(',')}</p>
          <Can permission="expedientes.aprobar">
            <button type="button">Aprobar</button>
          </Can>
          <Can permission="auditoria.consultar">
            <button type="button">Auditoría</button>
          </Can>
          <button type="button" onClick={() => void logout()}>
            Salir
          </button>
        </>
      )}
    </div>
  );
}

function renderSession(backend: FakeBackend) {
  return render(
    <ApiProvider client={backend.client}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </ApiProvider>,
  );
}

test('contrato: la identidad del backend llega entera a la interfaz', async () => {
  renderSession(signedInBackend(especialista));

  expect(await screen.findByText('nombre: Especialista Curricular')).toBeInTheDocument();
  expect(
    screen.getByText('permisos: expedientes.editar,expedientes.consultar,expedientes.aprobar'),
  );
  expect(await screen.findByText('roles: Especialista curricular')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Auditoría' })).not.toBeInTheDocument();
});

test('sin cookie de sesión queda anónimo, sin error', async () => {
  renderSession(fakeBackend());
  expect(await screen.findByText('estado: anonymous')).toBeInTheDocument();
  expect(screen.queryByText(/error:/)).not.toBeInTheDocument();
});

test('un backend caído no se confunde con falta de sesión', async () => {
  renderSession(
    fakeBackend({ 'GET /api/v1/users/current': () => problem(503, 'SERVICIO_NO_DISPONIBLE') }),
  );
  expect(await screen.findByText('estado: error')).toBeInTheDocument();
  expect(screen.getByText(/no está disponible/)).toBeInTheDocument();
});

test('si /roles falla se muestran los códigos de rol', async () => {
  const backend = signedInBackend(especialista);
  backend.on('GET /api/v1/roles', () => problem(500, 'ERROR_INTERNO'));
  renderSession(backend);
  expect(await screen.findByText('roles: ESPECIALISTA_CURRICULAR')).toBeInTheDocument();
});

test('cerrar sesión llama al backend y deja la sesión anónima', async () => {
  const backend = signedInBackend(especialista);
  renderSession(backend);
  await userEvent.click(await screen.findByRole('button', { name: 'Salir' }));
  expect(await screen.findByText('estado: anonymous')).toBeInTheDocument();
  expect(backend.calls).toContain('DELETE /api/v1/sessions/current');
});
