import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dossier, especialista, json, signedInBackend, stubApi } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('Gestión incluye registros posteriores a la primera página del backend', async () => {
  const user = userEvent.setup();
  const primeros = Array.from({ length: 25 }, (_, i) =>
    dossier({
      dossierId: `d-${String(i)}`,
      code: `ECD-${String(i)}`,
      title: `Asignatura ${String(i)}`,
    }),
  );
  const ultimo = dossier({
    dossierId: 'd-26',
    code: 'ECD-26',
    title: 'Expediente de segunda página',
  });
  const llamadas = stubApi({
    'GET /api/v1/dossiers': (_init: RequestInit, url: URL) =>
      json({
        data: url.searchParams.has('cursor') ? [ultimo] : primeros,
        meta: { pagination: { limit: 25, next: url.searchParams.has('cursor') ? null : 'c2' } },
      }),
  });
  renderApp(signedInBackend(especialista), '/expedientes');
  await screen.findByText('Asignatura 0');
  await user.type(screen.getByRole('searchbox', { name: /^buscar expedientes$/i }), ultimo.title);
  expect(await screen.findByRole('link', { name: ultimo.title })).toHaveAttribute(
    'href',
    '/revision?dossierId=d-26',
  );
  expect(llamadas).toHaveLength(2);
  expect(
    within(screen.getByRole('region', { name: 'Expedientes' })).getByText('ECD-26', {
      exact: false,
    }),
  ).toBeInTheDocument();
});
