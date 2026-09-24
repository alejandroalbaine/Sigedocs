import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ApiProvider } from '../common/api/ApiProvider.tsx';
import { SessionProvider } from '../common/auth/SessionProvider.tsx';
import { routes } from '../router.tsx';
import type { FakeBackend } from './backend.ts';

/** Monta la aplicación completa (rutas reales) contra un backend en memoria. */
export function renderApp(backend: FakeBackend, path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <ApiProvider client={backend.client}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ApiProvider>,
  );
  return { ...result, router };
}
