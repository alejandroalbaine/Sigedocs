/**
 * Recorrido del flujo de pregrado del primer corte, T1 a T6 (ADR-014, plan de trabajo B4):
 * T1 asignar, T2 iniciar revisión, T3 solicitar ajustes, T4 aprobar para pilotaje,
 * T5 reenviar y T6 iniciar reevaluación.
 *
 * El backend es un simulador en memoria que respeta el contrato (endpoints.md §6 y §7): el
 * servidor decide qué transiciones ofrece a cada usuario según el estado y sus permisos, y la
 * pantalla solo pinta lo que recibe. Cuando B4 esté en develop, este mismo recorrido se prueba
 * contra el backend real.
 *
 * Basado en el borrador de pruebas de Guillermo Adonis Mercedes.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dossier, problem, signedInBackend, stubApi } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

type Estado =
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUIRED'
  | 'RESUBMITTED'
  | 'IN_REEVALUATION'
  | 'APPROVED_FOR_PILOT';

const NOMBRES: Record<Estado, string> = {
  RECEIVED: 'Recepcionado',
  ASSIGNED: 'Asignado',
  IN_REVIEW: 'En revisión',
  CHANGES_REQUIRED: 'Requiere ajustes',
  RESUBMITTED: 'Reenviado',
  IN_REEVALUATION: 'En reevaluación',
  APPROVED_FOR_PILOT: 'Aprobado para pilotaje',
};

interface Transicion {
  transitionId: string;
  code: string;
  name: string;
  from: Estado;
  to: Estado;
  permiso: string;
  requiresObservation: boolean;
}

/** Transiciones T2 a T6 de ADR-014 (T1 se ejecuta con `POST /assignments`). */
const TRANSICIONES: Transicion[] = [
  {
    transitionId: 't2',
    code: 'START_REVIEW',
    name: 'Iniciar revisión',
    from: 'ASSIGNED',
    to: 'IN_REVIEW',
    permiso: 'workflow.start_review',
    requiresObservation: false,
  },
  {
    transitionId: 't3',
    code: 'REQUEST_CHANGES',
    name: 'Solicitar cambios',
    from: 'IN_REVIEW',
    to: 'CHANGES_REQUIRED',
    permiso: 'workflow.request_changes',
    requiresObservation: true,
  },
  {
    transitionId: 't4',
    code: 'APPROVE_FOR_PILOT',
    name: 'Aprobar para pilotaje',
    from: 'IN_REVIEW',
    to: 'APPROVED_FOR_PILOT',
    permiso: 'workflow.approve_for_pilot',
    requiresObservation: false,
  },
  {
    transitionId: 't5',
    code: 'RESUBMIT',
    name: 'Reenviar',
    from: 'CHANGES_REQUIRED',
    to: 'RESUBMITTED',
    permiso: 'workflow.resubmit',
    requiresObservation: false,
  },
  {
    transitionId: 't6',
    code: 'START_REEVALUATION',
    name: 'Iniciar reevaluación',
    from: 'RESUBMITTED',
    to: 'IN_REEVALUATION',
    permiso: 'workflow.start_reevaluation',
    requiresObservation: false,
  },
];

const ESPECIALISTA = { userId: 'esp-1', name: 'Especialista Curricular' };

const direccion = {
  userId: '10000000-0000-4000-8000-000000000021',
  name: 'Dirección de Gestión Curricular',
  email: 'dir.curricular@uapa.edu.do',
  roles: ['CURRICULUM_DIRECTOR'],
  permissions: ['dossiers.read', 'workflow.assign', 'workflow.approve_for_pilot', 'audit.read'],
};

const especialista = {
  userId: ESPECIALISTA.userId,
  name: ESPECIALISTA.name,
  email: 'especialista.curricular@uapa.edu.do',
  roles: ['CURRICULUM_SPECIALIST'],
  permissions: [
    'dossiers.read',
    'observations.create',
    'workflow.start_review',
    'workflow.request_changes',
    'workflow.start_reevaluation',
  ],
};

const coordinacion = {
  userId: '10000000-0000-4000-8000-000000000019',
  name: 'Coordinación de Programa',
  email: 'coord.programa@uapa.edu.do',
  roles: ['PROGRAM_COORDINATOR'],
  permissions: ['dossiers.read', 'dossiers.edit', 'workflow.resubmit'],
};

type Usuario = typeof direccion;

/**
 * Simulador del backend para un solo expediente. Guarda estado, versión e historial entre
 * llamadas, como lo haría el servidor, y rechaza lo que el contrato no permite.
 */
function crearBackend(inicial: Estado, usuario: Usuario) {
  let estado: Estado = inicial;
  let version = { versionId: 'v-1.0', label: 'v1.0' };
  let asignado: typeof ESPECIALISTA | null = inicial === 'RECEIVED' ? null : ESPECIALISTA;
  const historial: unknown[] = [];
  const envios: { ruta: string; body: Record<string, unknown> }[] = [];
  const base = dossier({ dossierId: 'd-1', code: 'ECD-2026-0001' });
  const ruta = `/api/v1/dossiers/${base.dossierId}`;
  const cuerpo = (init: RequestInit) =>
    JSON.parse(typeof init.body === 'string' ? init.body : '{}') as Record<string, unknown>;

  function registrar(nombre: string, code: string, desde: Estado, hacia: Estado, obs?: string) {
    historial.push({
      historyId: `h${String(historial.length + 1)}`,
      transition: { code, name: nombre },
      fromState: { code: desde, name: NOMBRES[desde] },
      toState: { code: hacia, name: NOMBRES[hacia] },
      versionLabel: version.label,
      user: { userId: usuario.userId, name: usuario.name },
      observation: obs ?? null,
      occurredAt: `2026-10-01T1${String(historial.length)}:00:00.000Z`,
    });
  }

  const llamadas = stubApi({
    'GET /api/v1/dossiers': () => [
      {
        ...base,
        currentState: {
          code: estado,
          name: NOMBRES[estado],
          isEditable: estado === 'RECEIVED' || estado === 'CHANGES_REQUIRED',
        },
        currentVersion: version,
        assignedSpecialist: asignado,
      },
    ],
    'GET /api/v1/users': [
      { ...ESPECIALISTA, roles: [{ roleId: 'r1', code: 'CURRICULUM_SPECIALIST', name: 'Esp.' }] },
    ],
    [`GET ${ruta}/available-transitions`]: () =>
      TRANSICIONES.filter(
        (item) => item.from === estado && usuario.permissions.includes(item.permiso),
      ).map((item) => ({
        transitionId: item.transitionId,
        code: item.code,
        name: item.name,
        toState: { code: item.to, name: NOMBRES[item.to] },
        requiresObservation: item.requiresObservation,
      })),
    [`GET ${ruta}/transitions`]: () => historial,
    [`POST ${ruta}/assignments`]: (init: RequestInit) => {
      const body = cuerpo(init);
      envios.push({ ruta: 'assignments', body });
      if (estado !== 'RECEIVED' && estado !== 'ASSIGNED') return problem(409, 'INVALID_TRANSITION');
      if (estado === 'RECEIVED') registrar('Asignar', 'ASSIGN', 'RECEIVED', 'ASSIGNED');
      estado = 'ASSIGNED';
      asignado = ESPECIALISTA;
      return {
        assignmentId: 'a1',
        specialist: ESPECIALISTA,
        assignedBy: { userId: usuario.userId, name: usuario.name },
        assignedAt: '2026-10-01T09:00:00.000Z',
      };
    },
    [`POST ${ruta}/transitions`]: (init: RequestInit) => {
      const body = cuerpo(init);
      envios.push({ ruta: 'transitions', body });
      const t = TRANSICIONES.find(
        (item) =>
          item.transitionId === body.transitionId &&
          item.from === estado &&
          usuario.permissions.includes(item.permiso),
      );
      if (!t) return problem(409, 'INVALID_TRANSITION');
      const observacion = typeof body.observation === 'string' ? body.observation : undefined;
      if (t.requiresObservation && !observacion?.trim()) {
        return problem(422, 'VALIDATION_FAILED', [{ field: 'observation', code: 'REQUIRED' }]);
      }
      const desde = estado;
      registrar(t.name, t.code, desde, t.to, observacion);
      estado = t.to;
      const anterior = version.versionId;
      // T3 congela la versión revisada y crea una versión menor (ADR-013).
      if (t.code === 'REQUEST_CHANGES') version = { versionId: 'v-1.1', label: 'v1.1' };
      return {
        historyId: `h${String(historial.length)}`,
        fromState: { code: desde, name: NOMBRES[desde] },
        toState: { code: t.to, name: NOMBRES[t.to] },
        versionId: anterior,
        newVersionId: version.versionId === anterior ? null : version.versionId,
        occurredAt: '2026-10-01T10:00:00.000Z',
      };
    },
  });

  return { llamadas, envios, historial, estado: () => estado };
}

async function abrirPestaña(nombre: RegExp) {
  await userEvent.click(await screen.findByRole('button', { name: nombre }));
}

async function marcar(criterio: number, opcion: 'Cumple' | 'No cumple' | 'No aplica') {
  const grupo = screen.getAllByRole('group', { name: /Contrastar con/ })[criterio];
  if (!grupo) throw new Error(`No existe el criterio ${String(criterio)}`);
  await userEvent.click(within(grupo).getByLabelText(opcion));
}

async function marcarTodos(opcion: 'Cumple' | 'No cumple') {
  const total = (await screen.findAllByRole('group', { name: /Contrastar con/ })).length;
  for (let i = 0; i < total; i++)
    await marcar(i, opcion === 'No cumple' && i > 0 ? 'Cumple' : opcion);
}

const contexto = () => screen.getByLabelText('Contexto del expediente');

test('T1 · la Dirección asigna la especialista: Recepcionado → Asignado', async () => {
  const be = crearBackend('RECEIVED', direccion);
  renderApp(signedInBackend(direccion), '/revision');
  await abrirPestaña(/6\. Workflow/);

  await userEvent.selectOptions(await screen.findByLabelText('Especialista curricular'), 'esp-1');
  await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));

  expect(await screen.findByText('Expediente asignado a Especialista Curricular.')).toBeVisible();
  expect(be.estado()).toBe('ASSIGNED');
  expect(be.envios).toEqual([{ ruta: 'assignments', body: { specialistId: 'esp-1' } }]);
  expect(await within(contexto()).findByText('Asignado')).toBeInTheDocument();
});

test('T2 · la especialista inicia la revisión: Asignado → En revisión', async () => {
  const be = crearBackend('ASSIGNED', especialista);
  renderApp(signedInBackend(especialista), '/revision');
  await abrirPestaña(/6\. Workflow/);

  await userEvent.click(await screen.findByRole('button', { name: 'Iniciar revisión' }));

  expect(await screen.findByText(/Transición registrada: Asignado → En revisión/)).toBeVisible();
  expect(be.estado()).toBe('IN_REVIEW');
  expect(be.envios[0]?.body).toEqual({ transitionId: 't2', versionId: 'v-1.0' });
});

test('T3 · solicitar ajustes exige un «No cumple» y la observación, y crea la versión 1.1', async () => {
  const be = crearBackend('IN_REVIEW', especialista);
  renderApp(signedInBackend(especialista), '/revision');
  const devolver = await screen.findByRole('button', { name: 'Devolver con observaciones' });

  // Sin incumplimientos ni observación no se envía nada.
  await userEvent.click(devolver);
  expect(screen.getByRole('alert')).toHaveTextContent(/al menos un criterio/);
  await marcarTodos('No cumple');
  await userEvent.click(devolver);
  expect(screen.getByRole('alert')).toHaveTextContent(/exige observaciones/);
  expect(be.envios).toHaveLength(0);

  await userEvent.type(
    screen.getByLabelText('Observaciones del revisor'),
    'Falta el perfil de egreso.',
  );
  await userEvent.click(devolver);

  expect(await screen.findByText(/Se creó una nueva versión del expediente/)).toBeVisible();
  expect(be.estado()).toBe('CHANGES_REQUIRED');
  const envio = be.envios[0]?.body;
  expect(envio).toMatchObject({ transitionId: 't3', versionId: 'v-1.0' });
  expect(String(envio?.observation)).toMatch(/No cumple[\s\S]*Falta el perfil de egreso\./);
  expect(await within(contexto()).findByText('v1.1')).toBeInTheDocument();
});

test('T4 · la Dirección aprueba para pilotaje con el checklist completo', async () => {
  const be = crearBackend('IN_REVIEW', direccion);
  renderApp(signedInBackend(direccion), '/revision');
  const aprobar = await screen.findByRole('button', { name: 'Aprobar para pilotaje' });
  // La Dirección no tiene workflow.request_changes: el servidor no le ofrece devolver.
  expect(screen.queryByRole('button', { name: 'Devolver con observaciones' })).toBeNull();

  await marcarTodos('Cumple');
  await userEvent.click(aprobar);

  expect(
    await screen.findByText(/Transición registrada: En revisión → Aprobado para pilotaje/),
  ).toBeVisible();
  expect(be.estado()).toBe('APPROVED_FOR_PILOT');
  expect(be.envios[0]?.body).toMatchObject({ transitionId: 't4' });
});

test('T5 · la Coordinación reenvía el expediente corregido: Requiere ajustes → Reenviado', async () => {
  const be = crearBackend('CHANGES_REQUIRED', coordinacion);
  renderApp(signedInBackend(coordinacion), '/revision');
  await abrirPestaña(/6\. Workflow/);

  await userEvent.click(await screen.findByRole('button', { name: 'Reenviar' }));

  expect(
    await screen.findByText(/Transición registrada: Requiere ajustes → Reenviado/),
  ).toBeVisible();
  expect(be.estado()).toBe('RESUBMITTED');
});

test('T6 · la especialista inicia la reevaluación: Reenviado → En reevaluación (no vuelve a En revisión)', async () => {
  const be = crearBackend('RESUBMITTED', especialista);
  renderApp(signedInBackend(especialista), '/revision');
  await abrirPestaña(/6\. Workflow/);

  await userEvent.click(await screen.findByRole('button', { name: 'Iniciar reevaluación' }));

  expect(await screen.findByText(/Reenviado → En reevaluación/)).toBeVisible();
  expect(be.estado()).toBe('IN_REEVALUATION');
  expect(be.estado()).not.toBe('IN_REVIEW');
});

test('los botones salen solo de lo que ofrece el servidor para el usuario y el estado', async () => {
  crearBackend('IN_REVIEW', coordinacion);
  renderApp(signedInBackend(coordinacion), '/revision');
  await abrirPestaña(/6\. Workflow/);

  expect(
    await screen.findByText('No hay otras acciones disponibles para su usuario ahora.'),
  ).toBeVisible();
  for (const nombre of ['Iniciar revisión', 'Reenviar', 'Iniciar reevaluación', 'Asignar']) {
    expect(screen.queryByRole('button', { name: nombre })).toBeNull();
  }
});

test('el historial muestra cada transición con su estado de origen y destino', async () => {
  const be = crearBackend('ASSIGNED', especialista);
  renderApp(signedInBackend(especialista), '/revision');
  await abrirPestaña(/6\. Workflow/);
  await userEvent.click(await screen.findByRole('button', { name: 'Iniciar revisión' }));
  await screen.findByText(/Transición registrada/);
  expect(be.historial).toHaveLength(1);

  await abrirPestaña(/7\. Historial/);
  expect(await screen.findByText(/Iniciar revisión: Asignado → En revisión/)).toBeInTheDocument();
  expect(screen.getByText('Expediente registrado')).toBeInTheDocument();
});

test('T1 · si backend asigna como transición (sin /assignments), se envía ASSIGN con la especialista', async () => {
  const base = dossier({ dossierId: 'd-2' });
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [base],
    'GET /api/v1/users': [
      { ...ESPECIALISTA, roles: [{ roleId: 'r1', code: 'CURRICULUM_SPECIALIST', name: 'Esp.' }] },
    ],
    [`GET /api/v1/dossiers/d-2/available-transitions`]: [
      {
        transitionId: 't1',
        code: 'ASSIGN',
        name: 'Asignar',
        toState: { code: 'ASSIGNED', name: 'Asignado' },
        requiresObservation: false,
      },
    ],
    [`POST /api/v1/dossiers/d-2/transitions`]: {
      historyId: 'h1',
      fromState: { code: 'RECEIVED', name: 'Recepcionado' },
      toState: { code: 'ASSIGNED', name: 'Asignado' },
      versionId: base.currentVersion.versionId,
      newVersionId: null,
      occurredAt: '2026-10-01T09:00:00.000Z',
    },
  });
  renderApp(signedInBackend(direccion), '/revision');
  await abrirPestaña(/6\. Workflow/);

  // T1 no aparece como botón suelto: necesita elegir especialista.
  expect(
    await screen.findByText('No hay otras acciones disponibles para su usuario ahora.'),
  ).toBeVisible();
  await userEvent.selectOptions(await screen.findByLabelText('Especialista curricular'), 'esp-1');
  await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));

  expect(await screen.findByText('Expediente asignado a Especialista Curricular.')).toBeVisible();
  const consulta = llamadas.find((llamada) => llamada.key === 'GET /api/v1/users');
  expect(consulta?.url.searchParams.get('roleCode')).toBe('CURRICULUM_SPECIALIST');
  expect(consulta?.url.searchParams.get('isActive')).toBe('true');
  expect(
    llamadas.find(
      (llamada) => llamada.key.endsWith('/transitions') && llamada.key.startsWith('POST'),
    )?.body,
  ).toEqual({
    transitionId: 't1',
    versionId: base.currentVersion.versionId,
    specialistId: 'esp-1',
  });
});

test('la lista de especialistas sale de assignment-candidates (backend v0.2.0)', async () => {
  const base = dossier({ dossierId: 'd-3' });
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [base],
    'GET /api/v1/dossiers/d-3/assignment-candidates': [
      { userId: 'esp-9', name: 'Especialista Asignable' },
    ],
    'GET /api/v1/dossiers/d-3/available-transitions': [],
  });
  renderApp(signedInBackend(direccion), '/revision');
  await abrirPestaña(/6\. Workflow/);
  const selector = await screen.findByLabelText('Especialista curricular');
  expect(await within(selector).findByText('Especialista Asignable')).toBeInTheDocument();
  expect(llamadas.some((llamada) => llamada.key === 'GET /api/v1/users')).toBe(false);
});

test('con un servidor sin assignment-candidates, la Dirección no ve un error de permiso', async () => {
  const base = dossier({ dossierId: 'd-4' });
  stubApi({
    'GET /api/v1/dossiers': [base],
    'GET /api/v1/users': () => problem(403, 'FORBIDDEN'),
    'GET /api/v1/dossiers/d-4/available-transitions': [],
  });
  renderApp(signedInBackend(direccion), '/revision');
  await abrirPestaña(/6\. Workflow/);
  expect(await screen.findByText(/asignación de especialistas está en preparación/)).toBeVisible();
  expect(screen.queryByText('No tiene permiso para realizar esta acción.')).not.toBeInTheDocument();
});
