import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import programa from '../../test/fixtures/course-program-template.json';
import { dossier, stubApi } from '../../test/backend.ts';
import { FormularioPrograma } from './FormularioPrograma.tsx';

const expediente = dossier({
  template: { templateId: 'tpl-1', templateVersionId: 'tv-1' },
});
const rutaVersion = `/api/v1/dossiers/${expediente.dossierId}/versions/${expediente.currentVersion.versionId}`;

function version(content: Record<string, unknown> = {}) {
  return {
    versionId: expediente.currentVersion.versionId,
    label: 'v1.0',
    state: { code: 'RECEIVED', name: 'Recepcionado' },
    createdBy: { userId: 'u1', name: 'Coordinación' },
    createdAt: '2026-09-27T10:00:00.000Z',
    approvedAt: null,
    templateVersionId: 'tv-1',
    content,
  };
}

function servidor(content: Record<string, unknown> = {}) {
  return stubApi({
    [`GET ${rutaVersion}`]: version(content),
    [`PATCH ${rutaVersion}`]: (init: RequestInit) =>
      version((JSON.parse(init.body as string) as { content: Record<string, unknown> }).content),
    'GET /api/v1/templates/tpl-1/versions/tv-1': programa,
    'GET /api/v1/institutional-catalogs/schools': [{ value: 'ESC-ING', label: 'Ingeniería' }],
  });
}

test('dibuja las 9 secciones de la plantilla y avisa catálogos pendientes', async () => {
  servidor();
  render(<FormularioPrograma dossier={expediente} editable />);
  expect(await screen.findByText('Datos académicos *')).toBeVisible();
  expect(screen.getAllByRole('group').length).toBeGreaterThan(0);
  expect(screen.getByText(/^Bibliografía/, { selector: 'summary span' })).toBeVisible();
  expect((await screen.findAllByText(/pendiente en el servidor/)).length).toBeGreaterThan(0);
});

test('revisar reglas marca obligatorios y cardinalidad junto al campo', async () => {
  servidor();
  render(<FormularioPrograma dossier={expediente} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar reglas' }));
  expect(screen.getByText(/pendiente\(s\)/)).toBeVisible();
  expect(screen.getAllByText(/Agregue al menos 1 elemento/).length).toBeGreaterThan(0);
});

test('agrega un elemento repetible y guarda el contenido con itemId', async () => {
  const llamadas = servidor({ datos_academicos: { asignatura: 'Ingeniería de Software I' } });
  render(<FormularioPrograma dossier={expediente} editable />);
  const grupo = await screen.findByRole('region', { name: 'Competencias fundamentales' });
  await userEvent.click(within(grupo).getByRole('button', { name: /Agregar/ }));
  expect(within(grupo).getByText('Competencias fundamentales 1')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
  expect(await screen.findByText('Borrador de v1.0 guardado.')).toBeVisible();

  const envio = llamadas.find((llamada) => llamada.key.startsWith('PATCH'));
  const content = (envio?.body as { content: Record<string, Record<string, unknown>> }).content;
  expect(content.datos_academicos?.asignatura).toBe('Ingeniería de Software I');
  const items = content.competencias_fundamentales?.competencias_fundamentales as {
    itemId: string;
  }[];
  expect(items).toHaveLength(1);
  expect(items[0]?.itemId).toMatch(/.+/);
});

test('sin permiso o estado editable se muestra en solo lectura', async () => {
  servidor({ datos_academicos: { asignatura: 'Ingeniería de Software I' } });
  render(<FormularioPrograma dossier={expediente} editable={false} />);
  expect(await screen.findByText('Ingeniería de Software I')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Guardar borrador' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('si la ruta de versiones no existe, lo dice sin inventar un formulario', async () => {
  stubApi({});
  render(<FormularioPrograma dossier={expediente} editable />);
  expect(await screen.findByText(/el servidor aún no implementa/)).toBeVisible();
});
