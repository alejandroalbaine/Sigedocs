import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import programaBackend from '../../test/fixtures/course-program-template.backend.json';
import {
  detalleVersion,
  dossier,
  especialista,
  problem,
  signedInBackend,
  stubApi,
  versionDossier,
} from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';
import { ordenarVersiones, parInicial } from './consulta.ts';

const expediente = dossier({
  currentState: { code: 'IN_REEVALUATION', name: 'En reevaluación', isEditable: false },
  currentVersion: { versionId: 'v-1.2', label: 'v1.2' },
  template: { templateId: 'tpl-1', templateVersionId: 'tv-1' },
});
const ruta = `/api/v1/dossiers/${expediente.dossierId}`;

const v10 = versionDossier({
  versionId: 'v-1.0',
  label: 'v1.0',
  createdAt: '2026-09-20T14:00:00.000Z',
});
const v11 = versionDossier({
  versionId: 'v-1.1',
  label: 'v1.1',
  createdAt: '2026-09-25T14:00:00.000Z',
});
const v12 = versionDossier({
  versionId: 'v-1.2',
  label: 'v1.2',
  state: { code: 'IN_REEVALUATION', name: 'En reevaluación', isEditable: false },
  createdAt: '2026-10-01T14:00:00.000Z',
});

const competencia = (itemId: string, codigo: string, texto: string) => ({
  itemId,
  codigo_competencia: codigo,
  competencia: texto,
  resultados_aprendizaje: [],
});

const contenido10 = {
  datos_academicos: { asignatura: 'Bases de Datos', creditos: 3 },
  descripcion_asignatura: { descripcion: 'Estudia el modelo relacional.' },
};
const contenido11 = {
  datos_academicos: { asignatura: 'Bases de Datos Avanzadas', creditos: 3 },
  descripcion_asignatura: { descripcion: 'Estudia el modelo relacional.' },
  competencias_fundamentales: {
    competencias_fundamentales: [competencia('cf1', 'CF1', 'Diseña bases de datos.')],
  },
};
const contenido12 = {
  datos_academicos: { asignatura: 'Bases de Datos Avanzadas', creditos: 4 },
  descripcion_asignatura: { descripcion: 'Estudia el modelo relacional y NoSQL.' },
  competencias_fundamentales: {
    competencias_fundamentales: [
      competencia('cf1', 'CF1', 'Diseña bases de datos.'),
      competencia('cf2', 'CF2', 'Optimiza consultas.'),
    ],
  },
};

function servidor(rutas: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/v1/dossiers': [expediente],
    // El backend lista de la más reciente a la más antigua.
    [`GET ${ruta}/versions`]: [v12, v11, v10],
    [`GET ${ruta}/versions/v-1.0`]: detalleVersion(v10, contenido10, 'tv-1'),
    [`GET ${ruta}/versions/v-1.1`]: detalleVersion(v11, contenido11, 'tv-1'),
    [`GET ${ruta}/versions/v-1.2`]: detalleVersion(v12, contenido12, 'tv-1'),
    'GET /api/v1/templates/tpl-1/versions/tv-1': programaBackend,
    ...rutas,
  });
}

async function abrirComparador() {
  renderApp(signedInBackend(especialista), `/revision?dossierId=${expediente.dossierId}`);
  await userEvent.click(await screen.findByRole('button', { name: /5\. Versiones/ }));
  return screen.findByRole('region', { name: 'Comparar versiones' });
}

function seccion(region: HTMLElement, titulo: string | RegExp) {
  return within(region).getByRole('region', { name: titulo });
}

test('ordena las versiones y elige la vigente contra la anterior', () => {
  const ordenadas = ordenarVersiones([
    v12,
    versionDossier({ versionId: 'v-2.0', label: 'v2.0' }),
    v10,
    v11,
  ]);
  expect(ordenadas.map((version) => version.label)).toEqual(['v1.0', 'v1.1', 'v1.2', 'v2.0']);
  expect(parInicial(ordenadas, 'v-1.2')).toEqual({ base: 'v-1.1', comparada: 'v-1.2' });
  expect(parInicial(ordenadas, 'no-listada')).toEqual({ base: 'v-1.2', comparada: 'v-2.0' });
  expect(parInicial([v10], 'v-1.0')).toBeNull();
});

test('compara por defecto la versión vigente con la anterior, sección por sección', async () => {
  const llamadas = servidor();
  const comparador = await abrirComparador();

  expect(within(comparador).getByLabelText('Versión base')).toHaveValue('v-1.1');
  expect(within(comparador).getByLabelText('Versión comparada')).toHaveValue('v-1.2');
  expect(
    await within(comparador).findByText('De v1.1 a v1.2 cambiaron 3 campos en 3 de 9 secciones.'),
  ).toBeInTheDocument();

  const datos = seccion(comparador, /Datos académicos/);
  expect(within(datos).getByText('1 campo con cambios')).toBeInTheDocument();
  const creditos = within(datos).getByRole('heading', { name: /Créditos/ }).parentElement;
  if (!creditos) throw new Error('Falta el campo Créditos');
  expect(creditos).toHaveTextContent('Modificado');
  expect(creditos).toHaveTextContent(/v1\.1\s*3\s*v1\.2\s*4/);
  // Lo que no cambió no se muestra por defecto.
  expect(within(datos).queryByText('Asignatura')).not.toBeInTheDocument();

  const descripcion = seccion(comparador, /Descripción de la asignatura/);
  expect(within(descripcion).getByText('y NoSQL').tagName).toBe('INS');

  const competencias = seccion(comparador, /Competencias fundamentales y resultados/);
  expect(
    within(competencias).getByText(/v1\.1: 1 elemento · v1\.2: 2 elementos/),
  ).toBeInTheDocument();
  const agregado = within(competencias).getByRole('heading', {
    name: /Competencias fundamentales 2/,
  });
  expect(agregado.closest('li')).toHaveTextContent('Agregado');
  expect(agregado.closest('li')).toHaveTextContent('Optimiza consultas.');
  expect(
    within(competencias).queryByRole('heading', { name: /Competencias fundamentales 1/ }),
  ).not.toBeInTheDocument();

  expect(within(comparador).getByText(/^Sin cambios: /)).toHaveTextContent(/Bibliografía/);
  expect(llamadas.map((llamada) => llamada.key)).toEqual(
    expect.arrayContaining([
      `GET ${ruta}/versions/v-1.1`,
      `GET ${ruta}/versions/v-1.2`,
      'GET /api/v1/templates/tpl-1/versions/tv-1',
    ]),
  );
  // Ambas versiones usan la misma plantilla: se consulta una sola vez.
  expect(llamadas.filter((llamada) => llamada.key.includes('/templates/'))).toHaveLength(1);
});

test('permite elegir otras dos versiones, intercambiarlas y ver también lo que no cambió', async () => {
  servidor();
  const comparador = await abrirComparador();
  await within(comparador).findByText(/De v1\.1 a v1\.2/);

  await userEvent.selectOptions(within(comparador).getByLabelText('Versión base'), 'v-1.0');
  expect(
    await within(comparador).findByText('De v1.0 a v1.2 cambiaron 4 campos en 3 de 9 secciones.'),
  ).toBeInTheDocument();
  const datos = seccion(comparador, /Datos académicos/);
  const asignatura = within(datos).getByRole('heading', { name: /Asignatura/ }).parentElement;
  if (!asignatura) throw new Error('Falta el campo Asignatura');
  expect(asignatura.querySelector('[data-lado="base"]')).toHaveTextContent('v1.0Bases de Datos');
  expect(asignatura.querySelector('[data-lado="comparada"]')).toHaveTextContent(
    /^v1\.2Bases de Datos\s*\[agregado: Avanzadas\]$/,
  );

  await userEvent.click(within(comparador).getByRole('button', { name: /Intercambiar/ }));
  expect(within(comparador).getByLabelText('Versión base')).toHaveValue('v-1.2');
  expect(within(comparador).getByLabelText('Versión comparada')).toHaveValue('v-1.0');
  expect(await within(comparador).findByText(/^De v1\.2 a v1\.0/)).toBeInTheDocument();

  await userEvent.click(within(comparador).getByLabelText('Mostrar también lo que no cambió'));
  expect(seccion(comparador, /Bibliografía/)).toHaveTextContent('Sin cambios');
  expect(
    within(seccion(comparador, /Datos académicos/)).getByRole('heading', { name: /Clave/ }),
  ).toBeInTheDocument();
});

test('la misma versión en ambos lados pide elegir dos distintas sin consultar', async () => {
  const llamadas = servidor();
  const comparador = await abrirComparador();
  await within(comparador).findByText(/De v1\.1 a v1\.2/);
  const antes = llamadas.length;
  await userEvent.selectOptions(within(comparador).getByLabelText('Versión base'), 'v-1.2');
  expect(
    within(comparador).getByText('Elija dos versiones distintas para compararlas.'),
  ).toBeVisible();
  expect(
    llamadas.slice(antes).filter((llamada) => llamada.key.includes('/versions/')),
  ).toHaveLength(0);
});

test('dos versiones idénticas lo dicen y explican por qué', async () => {
  servidor({ [`GET ${ruta}/versions/v-1.2`]: detalleVersion(v12, contenido11, 'tv-1') });
  const comparador = await abrirComparador();
  expect(
    await within(comparador).findByText('v1.1 y v1.2 tienen el mismo contenido.'),
  ).toBeVisible();
  expect(within(comparador).getByText(/la nueva versión empieza como copia/)).toBeVisible();
  expect(within(comparador).queryByRole('region')).not.toBeInTheDocument();
});

test('con una sola versión explica cuándo se podrá comparar', async () => {
  stubApi({
    'GET /api/v1/dossiers': [
      { ...expediente, currentVersion: { versionId: 'v-1.0', label: 'v1.0' } },
    ],
    [`GET ${ruta}/versions`]: [v10],
  });
  const comparador = await abrirComparador();
  expect(within(comparador).getByText(/tiene una sola versión/)).toBeVisible();
  expect(within(comparador).queryByLabelText('Versión base')).not.toBeInTheDocument();
});

test('un error del servidor se muestra sin detalles internos', async () => {
  servidor({ [`GET ${ruta}/versions/v-1.1`]: () => problem(500, 'INTERNAL_ERROR') });
  const comparador = await abrirComparador();
  const alerta = await within(comparador).findByRole('alert');
  expect(alerta).toHaveTextContent(
    'El servicio no está disponible en este momento. Inténtelo más tarde.',
  );
  expect(alerta).not.toHaveTextContent(/Detalle interno|Título del servidor/);
  expect(within(comparador).queryByText(/De v1\.1 a v1\.2/)).not.toBeInTheDocument();
});

test('si la ruta de versiones aún no responde, lo dice sin inventar una comparación', async () => {
  servidor({ [`GET ${ruta}/versions/v-1.1`]: () => problem(404, 'NOT_FOUND') });
  const comparador = await abrirComparador();
  expect(await within(comparador).findByText(/está en preparación/)).toBeVisible();
  expect(within(comparador).queryByRole('region')).not.toBeInTheDocument();
});

test('un solo cambio usa el singular y el texto agregado lleva aviso para lectores de pantalla', async () => {
  servidor({
    [`GET ${ruta}/versions/v-1.2`]: detalleVersion(
      v12,
      {
        ...contenido11,
        descripcion_asignatura: { descripcion: 'Estudia el modelo relacional y NoSQL.' },
      },
      'tv-1',
    ),
  });
  const comparador = await abrirComparador();
  expect(
    await within(comparador).findByText('De v1.1 a v1.2 cambió 1 campo en 1 de 9 secciones.'),
  ).toHaveAttribute('role', 'status');
  expect(within(comparador).getByText('y NoSQL').closest('ins')).toHaveTextContent(
    '[agregado: y NoSQL]',
  );
});

test('muestra un elemento quitado con su contenido y uno movido con su posición anterior', async () => {
  const unidad = (itemId: string, numero: number, nombre: string, tema: string) => ({
    itemId,
    numero_unidad: numero,
    nombre_unidad: nombre,
    temas: [{ itemId: `${itemId}-t`, tema }],
    estrategias_metodologicas: [],
    descripcion_aplicacion: '',
    tecnicas_evaluacion: [],
  });
  const u1 = unidad('u1', 1, 'Diseño físico', 'Índices');
  const u2 = unidad('u2', 2, 'Transacciones', 'ACID');
  const u3 = unidad('u3', 3, 'Bases distribuidas', 'Replicación');
  servidor({
    [`GET ${ruta}/versions/v-1.1`]: detalleVersion(
      v11,
      { unidades_didacticas: { unidades_didacticas: [u1, u2, u3] } },
      'tv-1',
    ),
    [`GET ${ruta}/versions/v-1.2`]: detalleVersion(
      v12,
      { unidades_didacticas: { unidades_didacticas: [u2, u1] } },
      'tv-1',
    ),
  });
  const comparador = await abrirComparador();
  const unidades = await within(comparador).findByRole('region', {
    name: /Unidades didácticas/,
  });

  const quitada = within(unidades)
    .getByRole('heading', { name: 'Unidades didácticas 3 de v1.1' })
    .closest('li');
  if (!quitada) throw new Error('Falta la unidad quitada');
  expect(quitada).toHaveTextContent('Quitado');
  expect(within(quitada).getByText('Nombre de la unidad')).toBeInTheDocument();
  expect(within(quitada).getByText('Replicación')).toBeInTheDocument();
  // Solo la unidad es encabezado: sus temas (subgrupo) no se ponen a su mismo nivel.
  expect(within(quitada).getAllByRole('heading')).toHaveLength(1);

  const movida = within(unidades)
    .getByRole('heading', { name: 'Unidades didácticas 2' })
    .closest('li');
  expect(movida).toHaveTextContent('Movido');
  expect(movida).toHaveTextContent('En v1.1 estaba en la posición 1.');
  expect(within(unidades).getByText(/Se cambió el orden de los elementos/)).toBeInTheDocument();
});
