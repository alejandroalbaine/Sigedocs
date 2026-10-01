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

test('ubica la observación en una sección y un campo de la plantilla', async () => {
  const ruta = `/api/v1/dossiers/${enRevision.dossierId}/observations`;
  const plantilla = `/api/v1/templates/${enRevision.template.templateId}/versions/${enRevision.template.templateVersionId}`;
  const guardadas: unknown[] = [];
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [enRevision],
    [`GET ${plantilla}`]: {
      templateVersionId: enRevision.template.templateVersionId,
      sections: [
        {
          key: 'plan_evaluacion',
          title: 'Plan de evaluación',
          position: 5,
          isActive: true,
          fields: [{ key: 'componentes_evaluacion', label: 'Componentes', position: 0 }],
        },
        {
          key: 'datos_academicos',
          title: 'Datos académicos',
          position: 0,
          isActive: true,
          fields: [
            { key: 'asignatura', label: 'Asignatura', position: 0 },
            { key: 'creditos', label: 'Créditos', position: 1 },
          ],
        },
        { key: 'retirada', title: 'Sección retirada', position: 9, isActive: false, fields: [] },
      ],
    },
    [`GET ${ruta}`]: () => guardadas,
    [`POST ${ruta}`]: (init: RequestInit) => {
      const body = JSON.parse(init.body as string) as Record<string, string>;
      const creada = {
        observationId: 'o2',
        versionId: body.versionId,
        text: body.text,
        sectionKey: body.sectionKey ?? null,
        fieldKey: body.fieldKey ?? null,
        createdBy: { userId: especialista.userId, name: especialista.name },
        createdAt: '2026-09-27T10:00:00.000Z',
      };
      guardadas.push(creada);
      return creada;
    },
  });
  renderApp(signedInBackend(especialista), '/observaciones');
  const seccion = await screen.findByLabelText('Sección del programa');
  expect(screen.queryByRole('option', { name: 'Sección retirada' })).not.toBeInTheDocument();
  const campo = screen.getByLabelText('Campo');
  expect(campo).toBeDisabled();
  await userEvent.selectOptions(seccion, 'datos_academicos');
  await userEvent.selectOptions(campo, 'creditos');
  await userEvent.type(
    screen.getByLabelText(/Observación sobre ECD-2026-0001/),
    'Los créditos no coinciden con el pensum.',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Registrar observación' }));
  expect(await screen.findByText('Datos académicos · Créditos')).toBeVisible();
  expect(llamadas.find((llamada) => llamada.key.startsWith('POST'))?.body).toEqual({
    versionId: enRevision.currentVersion.versionId,
    text: 'Los créditos no coinciden con el pensum.',
    sectionKey: 'datos_academicos',
    fieldKey: 'creditos',
  });
});

test('sin la plantilla disponible, la observación se registra como general', async () => {
  stubApi({
    'GET /api/v1/dossiers': [enRevision],
    [`GET /api/v1/dossiers/${enRevision.dossierId}/observations`]: [],
  });
  renderApp(signedInBackend(especialista), '/observaciones');
  expect(await screen.findByText('Sin observaciones en esta versión.')).toBeVisible();
  expect(screen.queryByLabelText('Sección del programa')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Observación sobre ECD-2026-0001/)).toHaveAttribute(
    'maxlength',
    '5000',
  );
});
