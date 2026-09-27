import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  adminSistema,
  dossier,
  especialista,
  signedInBackend,
  stubApi,
  stubDossiers,
} from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

const enRevision = dossier({
  currentState: { code: 'IN_REVIEW', name: 'En revisión', isEditable: false },
});

test('exige permiso para registrar observaciones', async () => {
  renderApp(signedInBackend(adminSistema), '/observaciones');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('sin expedientes en revisión explica por qué no se puede observar', async () => {
  stubDossiers([dossier()]);
  renderApp(signedInBackend(especialista), '/observaciones');
  expect(await screen.findByText(/Ningún expediente visible está En revisión/)).toBeVisible();
});

test('registra la observación sobre la versión vigente y la lista', async () => {
  const ruta = `/api/v1/dossiers/${enRevision.dossierId}/observations`;
  const guardadas: unknown[] = [];
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [enRevision],
    [`GET ${ruta}`]: () => guardadas,
    [`POST ${ruta}`]: (init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { text: string; versionId: string };
      const creada = {
        observationId: 'o1',
        versionId: body.versionId,
        text: body.text,
        createdBy: { userId: especialista.userId, name: especialista.name },
        createdAt: '2026-09-27T10:00:00.000Z',
      };
      guardadas.push(creada);
      return creada;
    },
  });
  renderApp(signedInBackend(especialista), '/observaciones');
  expect(await screen.findByText('Sin observaciones en esta versión.')).toBeVisible();
  await userEvent.type(
    screen.getByLabelText(/Observación sobre ECD-2026-0001/),
    'La evaluación no suma 100 %.',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Registrar observación' }));
  expect(await screen.findByText('Observación registrada.')).toBeVisible();
  expect(await screen.findByText('La evaluación no suma 100 %.')).toBeVisible();
  expect(llamadas.find((llamada) => llamada.key.startsWith('POST'))?.body).toEqual({
    versionId: enRevision.currentVersion.versionId,
    text: 'La evaluación no suma 100 %.',
  });
});
