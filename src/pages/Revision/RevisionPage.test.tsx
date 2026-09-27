import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  adminIntegral,
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
  assignedSpecialist: { userId: especialista.userId, name: 'Especialista Curricular' },
});

const soloConsulta = {
  ...especialista,
  userId: '10000000-0000-4000-8000-000000000014',
  name: 'Vicerrectoría Académica',
  roles: ['VRA'],
  permissions: ['expedientes.consultar'],
};

async function marcar(criterio: number, opcion: 'Cumple' | 'No cumple' | 'No aplica') {
  const grupos = screen.getAllByRole('group', { name: /Contrastar con/ });
  const grupo = grupos[criterio];
  if (!grupo) throw new Error(`No existe el criterio ${String(criterio)}`);
  await userEvent.click(within(grupo).getByLabelText(opcion));
}

test('exige permiso de consulta de expedientes', async () => {
  renderApp(signedInBackend(adminSistema), '/revision');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('sin expedientes muestra un estado vacío, no un documento inventado', async () => {
  renderApp(signedInBackend(especialista), '/revision');
  expect(await screen.findByText('Seleccione un expediente')).toBeInTheDocument();
  expect(screen.queryByText(/FIRMA DIGITAL|X\.509|TRD/i)).not.toBeInTheDocument();
});

test('muestra estado, versión, responsable, próxima acción y las 7 pestañas', async () => {
  stubDossiers([enRevision]);
  renderApp(signedInBackend(especialista), '/revision');
  const contexto = await screen.findByLabelText('Contexto del expediente');
  expect(within(contexto).getByText('En revisión')).toBeInTheDocument();
  expect(within(contexto).getByText('v1.0')).toBeInTheDocument();
  expect(within(contexto).getByText('Especialista Curricular')).toBeInTheDocument();
  expect(within(contexto).getByText(/Aplicar el checklist/)).toBeInTheDocument();
  const pestañas = within(screen.getByRole('navigation', { name: 'Secciones del expediente' }));
  expect(pestañas.getAllByRole('button')).toHaveLength(7);
  expect(screen.queryByRole('button', { name: /Rechazar/ })).not.toBeInTheDocument();
});

test('la aprobación exige todos los criterios y se bloquea con un "No cumple" (REG-06)', async () => {
  stubDossiers([enRevision]);
  renderApp(signedInBackend(especialista), '/revision');
  const aprobar = await screen.findByRole('button', { name: 'Aprobar para pilotaje' });

  await userEvent.click(aprobar);
  expect(screen.getByRole('alert')).toHaveTextContent(/Evalúe todos los criterios/);

  await marcar(0, 'No cumple');
  for (const indice of [1, 2, 3]) await marcar(indice, 'Cumple');
  await marcar(4, 'No aplica');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  await userEvent.click(aprobar);
  expect(screen.getByRole('alert')).toHaveTextContent(/aprobación queda bloqueada/);

  await marcar(0, 'Cumple');
  await userEvent.click(aprobar);
  expect(screen.getByText(/no se envió/)).toBeInTheDocument();
});

test('devolver exige un incumplimiento y observaciones (REG-01)', async () => {
  stubDossiers([enRevision]);
  renderApp(signedInBackend(especialista), '/revision');
  const devolver = await screen.findByRole('button', { name: 'Devolver con observaciones' });

  await userEvent.click(devolver);
  expect(screen.getByRole('alert')).toHaveTextContent(/al menos un criterio/);

  await marcar(2, 'No cumple');
  await userEvent.click(devolver);
  expect(screen.getByRole('alert')).toHaveTextContent(/exige observaciones/);

  await userEvent.type(screen.getByLabelText('Observaciones del revisor'), 'Faltan competencias.');
  await userEvent.click(devolver);
  expect(screen.getByText(/no se envió/)).toBeInTheDocument();
});

test('un rol de solo consulta no ve decisiones técnicas', async () => {
  stubDossiers([enRevision]);
  renderApp(signedInBackend(soloConsulta), '/revision');
  expect(await screen.findByText(/no emitir decisiones técnicas/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aprobar para pilotaje' })).not.toBeInTheDocument();
});

test('fuera de revisión las decisiones y el checklist quedan deshabilitados', async () => {
  stubDossiers([dossier()]);
  renderApp(signedInBackend(especialista), '/revision');
  expect(await screen.findByText(/Las decisiones se habilitan cuando/)).toBeInTheDocument();
  const criterios = screen.getAllByRole('group', { name: /Contrastar con/ });
  expect(criterios).toHaveLength(5);
  for (const grupo of criterios) expect(grupo).toBeDisabled();
});

test('con la ruta publicada, devolver envía la transición del contrato', async () => {
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [enRevision],
    [`GET /api/v1/dossiers/${enRevision.dossierId}/available-transitions`]: [
      {
        transitionId: 't3',
        code: 'REQUEST_CHANGES',
        name: 'Solicitar cambios',
        toState: { code: 'CHANGES_REQUIRED', name: 'Requiere ajustes' },
        requiresObservation: true,
      },
    ],
    [`POST /api/v1/dossiers/${enRevision.dossierId}/transitions`]: {
      historyId: 'h1',
      fromState: { code: 'IN_REVIEW', name: 'En revisión' },
      toState: { code: 'CHANGES_REQUIRED', name: 'Requiere ajustes' },
      versionId: enRevision.currentVersion.versionId,
      newVersionId: 'v2',
      occurredAt: '2026-09-27T10:00:00.000Z',
    },
  });
  renderApp(signedInBackend(especialista), '/revision');
  const devolver = await screen.findByRole('button', { name: 'Devolver con observaciones' });
  // El servidor no ofrece aprobar a este usuario: el botón no aparece.
  expect(screen.queryByRole('button', { name: 'Aprobar para pilotaje' })).not.toBeInTheDocument();

  await marcar(2, 'No cumple');
  await userEvent.type(screen.getByLabelText('Observaciones del revisor'), 'Faltan competencias.');
  await userEvent.click(devolver);

  expect(
    await screen.findByText(/Transición registrada: En revisión → Requiere ajustes/),
  ).toBeVisible();
  const envio = llamadas.find((llamada) => llamada.key.startsWith('POST'));
  expect(envio?.body).toMatchObject({
    transitionId: 't3',
    versionId: enRevision.currentVersion.versionId,
  });
  expect((envio?.body as { observation: string }).observation).toMatch(
    /Competencias fundamentales y específicas: No cumple[\s\S]*Faltan competencias\./,
  );
});

test('la Dirección asigna el expediente a un especialista', async () => {
  const recibido = dossier();
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [recibido],
    'GET /api/v1/users': [
      { userId: 'esp-1', name: 'Especialista Curricular', roles: ['CURRICULUM_SPECIALIST'] },
      { userId: 'vra-1', name: 'Vicerrectoría', roles: ['VRA'] },
    ],
    [`POST /api/v1/dossiers/${recibido.dossierId}/assignments`]: {
      assignmentId: 'a1',
      specialist: { userId: 'esp-1', name: 'Especialista Curricular' },
      assignedBy: { userId: adminIntegral.userId, name: adminIntegral.name },
      assignedAt: '2026-09-27T10:00:00.000Z',
    },
  });
  renderApp(
    signedInBackend({
      ...adminIntegral,
      permissions: [...adminIntegral.permissions, 'workflow.assign'],
    }),
    '/revision',
  );
  await userEvent.click(await screen.findByRole('button', { name: /6\. Workflow/ }));
  const selector = await screen.findByLabelText('Especialista curricular');
  expect(within(selector).queryByText('Vicerrectoría')).not.toBeInTheDocument();
  await userEvent.selectOptions(selector, 'esp-1');
  await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
  expect(await screen.findByText('Expediente asignado a Especialista Curricular.')).toBeVisible();
  expect(llamadas.find((llamada) => llamada.key.startsWith('POST'))?.body).toEqual({
    specialistId: 'esp-1',
  });
});

test('las pestañas con rutas no implementadas lo dicen sin inventar datos', async () => {
  stubDossiers([enRevision]);
  renderApp(signedInBackend(especialista), '/revision');
  await userEvent.click(await screen.findByRole('button', { name: /5\. Versiones/ }));
  expect(await screen.findByText(/GET \/dossiers\/\{id\}\/versions/)).toBeVisible();
  expect(screen.getByText(/aún no la implementa/)).toBeVisible();
});
