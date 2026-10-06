/// <reference types="node" />
/** HTTP real: requiere una API local y una base de desarrollo/pruebas migrada. */
import process from 'node:process';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createApiClient } from '../common/api/client.ts';
import { dossiersApi } from '../common/api/dossiers.ts';
import { ApiError } from '../common/api/errors.ts';
import { FormularioPrograma } from '../features/programa/FormularioPrograma.tsx';
import { comprobarEnvio } from '../features/programa/comprobarEnvio.ts';
import { renderApp } from './renderApp.tsx';

const realFetch = globalThis.fetch;
const base = process.env.B3_API_BASE_URL ?? 'http://localhost:3001';
const email = process.env.B3_EMAIL ?? 'coord.programa@uapa.edu.do';
const password = process.env.B3_PASSWORD;
const run = Date.now().toString(36);
let cookie = '';
const input = {
  title: `Prueba de integración B3 ${run}`,
  academicLevel: 'bachelor' as const,
  schoolCode: 'ESC-ING',
  degreeProgramCode: 'ISW',
  subjectCode: `B3-${run}`,
};

async function fetchConSesion(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cookie', cookie);
  const url = new URL(path, base);
  return realFetch(new URL(url.pathname + url.search, base), { ...init, headers });
}

beforeAll(async () => {
  if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
    throw new Error('B3_API_BASE_URL debe apuntar a la API local de pruebas.');
  if (!password) throw new Error('Defina B3_PASSWORD con la contraseña de la cuenta de pruebas.');
  const login = await realFetch(`${base}/api/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(login.status).toBe(200);
  cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';
  expect(cookie).not.toBe('');
});

beforeEach(() => {
  localStorage.clear();
  // Transporte HTTP real con cookie: Node no tiene el almacén de cookies del navegador.
  vi.stubGlobal('fetch', fetchConSesion);
});

afterAll(async () => {
  if (cookie) await fetchConSesion('/api/v1/sessions/current', { method: 'DELETE' });
});

function abrir(path: string) {
  return renderApp(
    {
      client: createApiClient({ baseUrl: base, fetchImpl: fetchConSesion }),
      calls: [],
      on: () => undefined,
    },
    path,
  );
}

test('Programa: errores reales por campo y reglas oficiales sobre contenido persistido', async () => {
  const { data: expediente } = await dossiersApi.create({
    ...input,
    title: `Validación de programa ${run}`,
  });
  let rechazo: ApiError | undefined;
  try {
    await dossiersApi.saveContent(expediente.dossierId, expediente.currentVersion.versionId, {
      datos_academicos: { creditos: 'incorrecto' },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    rechazo = error;
  }
  expect(rechazo?.status).toBe(422);
  const credito = rechazo?.fieldErrors.find((item) => item.field === 'datos_academicos.creditos');
  expect(credito?.message).toBeTruthy();
  const vista = render(
    <FormularioPrograma
      dossier={expediente}
      editable
      erroresRevision={rechazo?.fieldErrors ?? []}
    />,
  );
  const campo = await screen.findByRole('spinbutton', { name: 'Créditos *' });
  expect(campo).toHaveAttribute('aria-invalid', 'true');
  expect(campo.parentElement).toHaveTextContent(credito?.message ?? 'Falta mensaje del servidor');
  const enlaces = within(
    screen.getByRole('navigation', { name: 'Errores del programa' }),
  ).getAllByRole('link', { name: 'Datos académicos · Créditos' });
  const enlace = enlaces.at(-1);
  if (!enlace) throw new Error('Falta enlace al campo');
  await userEvent.click(enlace);
  expect(campo).toHaveFocus();
  vista.unmount();

  // El MVP acepta este borrador: sus reglas de documento/primer nivel todavía no están en BD.
  await dossiersApi.saveContent(expediente.dossierId, expediente.currentVersion.versionId, {
    plan_evaluacion: { componentes_evaluacion: [{ itemId: 'eval-1', porcentaje: 90 }] },
    unidades_didacticas: {
      unidades_didacticas: Array.from({ length: 11 }, (_, index) => ({
        itemId: `unidad-${String(index)}`,
      })),
    },
  });
  try {
    await comprobarEnvio(expediente);
    throw new Error('El envío debía rechazar el contenido inválido');
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    expect(error.status).toBe(422);
    expect(error.fieldErrors.map((item) => item.field)).toEqual([
      'unidades_didacticas.unidades_didacticas',
      'plan_evaluacion.componentes_evaluacion',
    ]);
  }
  const formulario = render(<FormularioPrograma dossier={expediente} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar reglas' }));
  expect(
    within(screen.getByRole('region', { name: 'Componentes de evaluación' })).getByText(
      /100 %.*Suma actual: 90/,
    ),
  ).toBeVisible();
  expect(
    within(screen.getByRole('region', { name: 'Unidades didácticas' })).getByText(
      'El programa admite como máximo 10 unidades didácticas.',
    ),
  ).toBeVisible();
  formulario.unmount();
});

test('Registro → PostgreSQL → Gestión → Panel, incluyendo más de 25 expedientes', async () => {
  const user = userEvent.setup();
  const registro = abrir('/expedientes/nuevo');
  await screen.findByRole('heading', { name: /paso 1:/i });
  await user.type(screen.getByLabelText(/título del expediente/i), ` ${input.title} `);
  await user.click(screen.getByRole('button', { name: /continuar/i }));
  await user.type(screen.getByLabelText(/unidad productora/i), ` ${input.schoolCode} `);
  await user.type(screen.getByLabelText(/código de programa/i), input.degreeProgramCode);
  await user.type(screen.getByLabelText(/código de asignatura/i), input.subjectCode);
  for (let step = 2; step < 5; step++)
    await user.click(screen.getByRole('button', { name: /continuar/i }));
  await user.click(screen.getByRole('button', { name: /radicar expediente/i }));
  expect(
    await screen.findByText(/registrado correctamente en estado Recepcionado/i),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /expediente registrado/i })).toBeDisabled();
  registro.unmount();

  const creados = await dossiersApi.listAll(`&search=${encodeURIComponent(input.subjectCode)}`);
  expect(creados.data).toHaveLength(1);
  const creado = creados.data[0];
  expect(creado).toMatchObject({
    ...input,
    documentType: 'course_program',
    currentState: { code: 'RECEIVED', isEditable: true },
    currentVersion: { label: 'v1.0' },
    assignedSpecialist: null,
  });
  if (!creado) throw new Error('El expediente no quedó persistido.');
  expect((await dossiersApi.get(creado.dossierId)).data).toEqual(creado);
  // El registro del asistente queda más allá de los primeros 25, por orden descendente.
  for (let i = 0; i < 25; i++)
    await dossiersApi.create({ ...input, title: `Paginación B3 ${run} ${String(i)}` });
  const todos = await dossiersApi.listAll();
  expect(todos.data.length).toBeGreaterThanOrEqual(26);

  const gestion = abrir('/expedientes');
  await screen.findByRole('table');
  await user.type(screen.getByRole('searchbox', { name: /^buscar expedientes$/i }), input.title);
  expect(await screen.findByRole('link', { name: input.title })).toHaveAttribute(
    'href',
    `/revision?dossierId=${creado.dossierId}`,
  );
  expect(screen.getByText('v1.0')).toBeInTheDocument();
  expect(screen.getByText('Recepcionado')).toBeInTheDocument();
  gestion.unmount();

  const panel = abrir('/');
  await screen.findByRole('button', { name: /exportar reporte/i });
  const total = within(screen.getByRole('list', { name: 'Indicadores' })).getByText(
    'Total visibles',
  ).parentElement;
  expect(total?.querySelector('strong')).toHaveTextContent(String(todos.data.length));
  panel.unmount();
});

test('B3 devuelve un 422 real por un título mayor de 300 caracteres', async () => {
  await expect(dossiersApi.create({ ...input, title: 'a'.repeat(301) })).rejects.toMatchObject({
    status: 422,
    code: 'VALIDATION_FAILED',
  });
});

test('B3 protege el listado real cuando no se envía cookie', async () => {
  const response = await realFetch(`${base}/api/v1/dossiers`);
  expect(response.status).toBe(401);
});
