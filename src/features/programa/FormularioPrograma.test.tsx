import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import programaBackend from '../../test/fixtures/course-program-template.backend.json';
import { dossier, problem, stubApi } from '../../test/backend.ts';
import { FormularioPrograma } from './FormularioPrograma.tsx';
import { idCampo } from './erroresPrograma.ts';

const expediente = dossier({
  template: { templateId: 'tpl-1', templateVersionId: 'tv-1' },
});

const rutaVersion = `/api/v1/dossiers/${expediente.dossierId}/versions/${expediente.currentVersion.versionId}`;

test('el reenvío bloquea una suma distinta de 100 % antes de guardar o ejecutar la transición', async () => {
  const llamadas = servidor({
    plan_evaluacion: { componentes_evaluacion: [{ itemId: 'eval1', porcentaje: 90 }] },
  });
  const conAjustes = {
    ...expediente,
    currentState: { code: 'CHANGES_REQUIRED', name: 'Requiere ajustes', isEditable: true },
  };
  render(<FormularioPrograma dossier={conAjustes} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Reenviar' }));
  expect(screen.getByRole('navigation', { name: 'Errores del programa' })).toHaveTextContent(
    'Suma actual: 90',
  );
  expect(llamadas.some((item) => item.key.startsWith('POST') || item.key.startsWith('PATCH'))).toBe(
    false,
  );
});

const metadatosPlantilla = {
  templateId: 'tpl-1',
  code: 'COURSE_PROGRAM',
  name: 'Programa de asignatura',
  description: null,
  documentType: 'course_program',
  academicLevels: ['bachelor'],
  latestVersionNumber: 1,
  latestPublishedVersionNumber: 1,
  createdAt: '2026-09-27T10:00:00.000Z',
};

test('el resumen abre una sección cerrada y enfoca el campo con error', async () => {
  servidor();
  render(<FormularioPrograma dossier={expediente} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar reglas' }));
  const campo = screen.getByRole('textbox', { name: 'Asignatura *' });
  const seccion = campo.closest('details');
  if (!seccion) throw new Error('Falta sección');
  seccion.open = false;
  await userEvent.click(
    within(screen.getByRole('navigation', { name: 'Errores del programa' })).getByRole('link', {
      name: 'Datos académicos · Asignatura',
    }),
  );
  expect(seccion.open).toBe(true);
  expect(campo).toHaveFocus();
  expect(campo).toHaveAttribute('aria-invalid', 'true');
  expect(campo).toHaveAccessibleDescription('Complete "Asignatura".');
});

test('muestra varios errores del servidor junto al campo con un solo id accesible y los limpia al corregir', async () => {
  stubApi({
    [`GET ${rutaVersion}`]: version({ datos_academicos: { asignatura: 'Prueba' } }),
    [`PATCH ${rutaVersion}`]: () =>
      problem(422, 'VALIDATION_FAILED', [
        {
          field: 'datos_academicos.asignatura',
          code: 'LENGTH',
          message: 'El nombre es demasiado corto.',
        },
        {
          field: 'datos_academicos.asignatura',
          code: 'PATTERN',
          message: 'El nombre tiene un formato incorrecto.',
        },
      ]),
    'GET /api/v1/templates/tpl-1': metadatosPlantilla,
    'GET /api/v1/templates/tpl-1/versions/tv-1': programaBackend,
  });
  render(<FormularioPrograma dossier={expediente} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Guardar borrador' }));
  const campo = screen.getByRole('textbox', { name: 'Asignatura *' });
  const contenedor = campo.parentElement;
  if (!contenedor) throw new Error('Falta contenedor del campo');
  await within(contenedor).findByText('El nombre es demasiado corto.');
  expect(campo).toHaveAccessibleDescription(
    /El nombre es demasiado corto.*El nombre tiene un formato incorrecto/,
  );
  const id = campo.getAttribute('aria-describedby');
  expect([...document.querySelectorAll('[id]')].filter((item) => item.id === id)).toHaveLength(1);
  expect(screen.queryByText('Detalle interno del servidor')).not.toBeInTheDocument();
  await userEvent.type(campo, ' corregida');
  expect(screen.queryByText('El nombre es demasiado corto.')).not.toBeInTheDocument();
  expect(campo).not.toHaveAttribute('aria-invalid');
});

test('el error de suma aparece en el plan, permite navegar y desaparece al llegar a 100 %', async () => {
  servidor({
    plan_evaluacion: {
      componentes_evaluacion: [{ itemId: 'e1', componente: 'Prueba', porcentaje: 90 }],
    },
  });
  render(<FormularioPrograma dossier={expediente} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar reglas' }));
  const grupo = screen.getByRole('region', { name: 'Componentes de evaluación' });
  expect(within(grupo).getByText(/100 %.*Suma actual: 90/)).toBeVisible();
  await userEvent.click(
    within(screen.getByRole('navigation', { name: 'Errores del programa' })).getByRole('link', {
      name: 'Plan de evaluación · Componentes de evaluación',
    }),
  );
  expect(grupo).toHaveFocus();
  const porcentaje = within(grupo).getByRole('spinbutton', { name: /Porcentaje/ });
  await userEvent.clear(porcentaje);
  await userEvent.type(porcentaje, '100');
  expect(within(grupo).queryByText(/100 %.*Suma actual/)).not.toBeInTheDocument();
});

test('señala 11 unidades existentes y permite quitar la excedente; no deja agregar una undécima', async () => {
  servidor({
    unidades_didacticas: {
      unidades_didacticas: Array.from({ length: 11 }, (_, index) => ({
        itemId: `u${String(index)}`,
        nombre_unidad: `Unidad ${String(index)}`,
      })),
    },
  });
  render(<FormularioPrograma dossier={expediente} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar reglas' }));
  const grupo = screen.getByRole('region', { name: 'Unidades didácticas' });
  expect(
    within(grupo).getByText('El programa admite como máximo 10 unidades didácticas.'),
  ).toBeVisible();
  await userEvent.click(within(grupo).getByRole('button', { name: 'Quitar elemento 11' }));
  expect(
    within(grupo).queryByText('El programa admite como máximo 10 unidades didácticas.'),
  ).not.toBeInTheDocument();
  expect(within(grupo).queryByRole('button', { name: /Agregar unidades/ })).not.toBeInTheDocument();
});

test('navega a un error anidado por itemId, incluso después de reordenar', async () => {
  servidor({
    competencias_fundamentales: {
      competencias_fundamentales: [
        {
          itemId: 'cf1',
          competencia: 'Primera',
          resultados_aprendizaje: [{ itemId: 'ra1', resultado: '' }],
        },
        { itemId: 'cf2', competencia: 'Segunda', resultados_aprendizaje: [] },
      ],
    },
  });
  render(<FormularioPrograma dossier={expediente} editable />);
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar reglas' }));
  const grupo = screen.getByRole('region', { name: 'Competencias fundamentales' });
  const bajar = within(grupo)
    .getAllByRole('button', { name: 'Bajar elemento 1' })
    .find((boton) => boton.closest('section') === grupo);
  if (!bajar) throw new Error('Falta botón para reordenar');
  await userEvent.click(bajar);
  const campo = document.getElementById(
    idCampo(
      'competencias_fundamentales.competencias_fundamentales[cf1].resultados_aprendizaje[ra1].resultado',
    ),
  );
  expect(campo).not.toBeNull();
  await userEvent.click(
    within(screen.getByRole('navigation', { name: 'Errores del programa' })).getByRole('link', {
      name: /Competencias fundamentales 2.*Resultados de aprendizaje 1.*Resultado/,
    }),
  );
  expect(campo).toHaveFocus();
});

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
      version(
        (
          JSON.parse(init.body as string) as {
            content: Record<string, unknown>;
          }
        ).content,
      ),
    'GET /api/v1/templates/tpl-1': metadatosPlantilla,
    'GET /api/v1/templates/tpl-1/versions/tv-1': programaBackend,
    'GET /api/v1/institutional-catalogs/schools': [{ value: 'ESC-ING', label: 'Ingeniería' }],
  });
}

test('dibuja el formulario con la respuesta real del backend', async () => {
  stubApi({
    [`GET ${rutaVersion}`]: version(),
    'GET /api/v1/templates/tpl-1': metadatosPlantilla,
    'GET /api/v1/templates/tpl-1/versions/tv-1': programaBackend,
  });

  render(<FormularioPrograma dossier={expediente} editable />);

  expect(await screen.findByText('Datos académicos *')).toBeVisible();
  expect(screen.getByText(/^Bibliografía/, { selector: 'summary span' })).toBeVisible();
});

test('revisar reglas marca los campos obligatorios de la plantilla real', async () => {
  servidor();

  render(<FormularioPrograma dossier={expediente} editable />);

  await userEvent.click(await screen.findByRole('button', { name: 'Revisar reglas' }));

  expect(screen.getByText(/pendiente\(s\)/)).toBeVisible();
  expect(screen.getByText('Complete "Asignatura".')).toBeVisible();
  expect(screen.getByText('Complete "Créditos".')).toBeVisible();
});

test('agrega un elemento repetible y guarda el contenido con itemId', async () => {
  const llamadas = servidor({
    datos_academicos: { asignatura: 'Ingeniería de Software I' },
  });

  render(<FormularioPrograma dossier={expediente} editable />);

  const grupo = await screen.findByRole('region', {
    name: 'Competencias fundamentales',
  });

  await userEvent.click(within(grupo).getByRole('button', { name: /Agregar/ }));

  expect(within(grupo).getByText('Competencias fundamentales 1')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

  expect(await screen.findByText('Borrador de v1.0 guardado.')).toBeVisible();

  const envio = llamadas.find((llamada) => llamada.key.startsWith('PATCH'));

  const content = (
    envio?.body as {
      content: Record<string, Record<string, unknown>>;
    }
  ).content;

  expect(content.datos_academicos?.asignatura).toBe('Ingeniería de Software I');

  const items = content.competencias_fundamentales?.competencias_fundamentales as {
    itemId: string;
  }[];

  expect(items).toHaveLength(1);
  expect(items[0]?.itemId).toMatch(/.+/);
});

test('sin permiso o estado editable se muestra en solo lectura', async () => {
  servidor({
    datos_academicos: { asignatura: 'Ingeniería de Software I' },
  });

  render(<FormularioPrograma dossier={expediente} editable={false} />);

  expect(await screen.findByText('Ingeniería de Software I')).toBeVisible();

  expect(screen.queryByRole('button', { name: 'Guardar borrador' })).not.toBeInTheDocument();

  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('si la ruta de versiones no existe, lo dice sin inventar un formulario', async () => {
  stubApi({});

  render(<FormularioPrograma dossier={expediente} editable />);

  expect(await screen.findByText(/está en preparación/)).toBeVisible();
});

test('reenvía correctamente un programa en estado Requiere ajustes', async () => {
  const expedienteConAjustes = dossier({
    template: { templateId: 'tpl-1', templateVersionId: 'tv-1' },
    currentState: {
      code: 'CHANGES_REQUIRED',
      name: 'Requiere ajustes',
      isEditable: true,
    },
  });

  const ruta =
    `/api/v1/dossiers/${expedienteConAjustes.dossierId}/versions/` +
    expedienteConAjustes.currentVersion.versionId;

  const llamadas = stubApi({
    [`GET ${ruta}`]: version({
      plan_evaluacion: { componentes_evaluacion: [{ itemId: 'eval1', porcentaje: 100 }] },
    }),

    [`PATCH ${ruta}`]: (init: RequestInit) =>
      version(
        (
          JSON.parse(init.body as string) as {
            content: Record<string, unknown>;
          }
        ).content,
      ),

    'GET /api/v1/templates/tpl-1': metadatosPlantilla,
    'GET /api/v1/templates/tpl-1/versions/tv-1': programaBackend,

    [`GET /api/v1/dossiers/${expedienteConAjustes.dossierId}/available-transitions`]: [
      {
        transitionId: 't5',
        code: 'RESUBMIT',
        name: 'Reenviar',
        toState: {
          code: 'RESUBMITTED',
          name: 'Reenviado',
        },
        requiresObservation: false,
      },
    ],

    [`POST /api/v1/dossiers/${expedienteConAjustes.dossierId}/transitions`]: {
      historyId: 'hist-1',
      fromState: {
        code: 'CHANGES_REQUIRED',
        name: 'Requiere ajustes',
      },
      toState: {
        code: 'RESUBMITTED',
        name: 'Reenviado',
      },
      versionId: expedienteConAjustes.currentVersion.versionId,
      newVersionId: null,
      occurredAt: '2026-10-05T20:00:00.000Z',
    },
  });

  render(<FormularioPrograma dossier={expedienteConAjustes} editable />);

  await userEvent.click(await screen.findByRole('button', { name: 'Reenviar' }));

  expect(await screen.findByText('Programa reenviado correctamente.')).toBeVisible();

  expect(
    llamadas.some(
      (llamada) =>
        llamada.key === `POST /api/v1/dossiers/${expedienteConAjustes.dossierId}/transitions`,
    ),
  ).toBe(true);
});

test('oculta Reenviar cuando el expediente no está en Requiere ajustes', async () => {
  servidor();

  render(<FormularioPrograma dossier={expediente} editable />);

  await screen.findByRole('button', {
    name: 'Guardar borrador',
  });

  expect(screen.queryByRole('button', { name: 'Reenviar' })).not.toBeInTheDocument();
});

test('muestra campos pendientes cuando el reenvío responde 422', async () => {
  const expedienteConAjustes = dossier({
    template: { templateId: 'tpl-1', templateVersionId: 'tv-1' },
    currentState: {
      code: 'CHANGES_REQUIRED',
      name: 'Requiere ajustes',
      isEditable: true,
    },
  });

  const ruta =
    `/api/v1/dossiers/${expedienteConAjustes.dossierId}/versions/` +
    expedienteConAjustes.currentVersion.versionId;

  stubApi({
    [`GET ${ruta}`]: version({
      plan_evaluacion: { componentes_evaluacion: [{ itemId: 'eval1', porcentaje: 100 }] },
    }),

    [`PATCH ${ruta}`]: (init: RequestInit) =>
      version(
        (
          JSON.parse(init.body as string) as {
            content: Record<string, unknown>;
          }
        ).content,
      ),

    'GET /api/v1/templates/tpl-1': metadatosPlantilla,
    'GET /api/v1/templates/tpl-1/versions/tv-1': programaBackend,

    [`GET /api/v1/dossiers/${expedienteConAjustes.dossierId}/available-transitions`]: [
      {
        transitionId: 't5',
        code: 'RESUBMIT',
        name: 'Reenviar',
        toState: {
          code: 'RESUBMITTED',
          name: 'Reenviado',
        },
        requiresObservation: false,
      },
    ],

    [`POST /api/v1/dossiers/${expedienteConAjustes.dossierId}/transitions`]: problem(
      422,
      'VALIDATION_FAILED',
      [
        {
          field: 'datos_academicos.asignatura',
          code: 'REQUIRED',
        },
      ],
    ),
  });

  render(<FormularioPrograma dossier={expedienteConAjustes} editable />);

  await userEvent.click(await screen.findByRole('button', { name: 'Reenviar' }));

  expect(
    await screen.findByText(
      'El programa no cumple las reglas de la plantilla. Revise los campos señalados.',
    ),
  ).toBeVisible();
});
