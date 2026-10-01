import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dossier, especialista, json, signedInBackend, stubApi } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

const coordinador = {
  ...especialista,
  roles: ['PROGRAM_COORDINATOR'],
  permissions: ['dossiers.create', 'dossiers.read'],
};
const creado = dossier();
const datos = {
  title: creado.title,
  academicLevel: creado.academicLevel,
  schoolCode: creado.schoolCode,
  degreeProgramCode: creado.degreeProgramCode,
  subjectCode: creado.subjectCode,
};

async function abrirRegistro() {
  const app = renderApp(signedInBackend(coordinador), '/expedientes/nuevo');
  await screen.findByRole('heading', { name: /paso 1: información general/i });
  return app;
}

async function completarClasificacion(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/título del expediente/i), datos.title);
  await user.click(screen.getByRole('button', { name: /continuar/i }));
  await user.type(screen.getByLabelText(/unidad productora/i), datos.schoolCode);
  await user.type(screen.getByLabelText(/código de programa/i), datos.degreeProgramCode);
  await user.type(screen.getByLabelText(/código de asignatura/i), datos.subjectCode);
}

async function llegarAConfirmacion(user: ReturnType<typeof userEvent.setup>) {
  await completarClasificacion(user);
  for (let paso = 2; paso < 5; paso++) {
    await user.click(screen.getByRole('button', { name: /continuar/i }));
  }
}

describe('Registro de expedientes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test.each(['', '   '])('rechaza el título vacío o con espacios (%j)', async (title) => {
    const user = userEvent.setup();
    const llamadas = stubApi({});
    await abrirRegistro();
    if (title) await user.type(screen.getByLabelText(/título del expediente/i), title);
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText('Complete el título del expediente.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /paso 1:/i })).toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });

  test.each(['unidad productora', 'código de programa', 'código de asignatura'])(
    'impide avanzar si falta %s',
    async (faltante) => {
      const user = userEvent.setup();
      const llamadas = stubApi({});
      await abrirRegistro();
      await completarClasificacion(user);
      await user.clear(screen.getByLabelText(new RegExp(faltante, 'i')));
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      expect(
        screen.getByText('Complete los códigos de unidad, programa y asignatura.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /paso 2:/i })).toBeInTheDocument();
      expect(llamadas).toHaveLength(0);
    },
  );

  test('no permite saltar a un paso futuro desde el indicador', async () => {
    const user = userEvent.setup();
    await abrirRegistro();
    await user.click(screen.getByRole('button', { name: /paso 05/i }));
    expect(screen.getByRole('heading', { name: /paso 1:/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /radicar expediente/i })).not.toBeInTheDocument();
  });

  test('recorre los cinco pasos y conserva los datos al regresar', async () => {
    const user = userEvent.setup();
    await abrirRegistro();
    await completarClasificacion(user);
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByRole('heading', { name: /paso 3: archivo digital/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByRole('heading', { name: /paso 4: retención/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/notas archivísticas/i), 'Nota local');
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByRole('heading', { name: /paso 5: confirmación/i })).toBeInTheDocument();
    expect(screen.getByText(datos.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /paso anterior/i }));
    expect(screen.getByLabelText(/notas archivísticas/i)).toHaveValue('Nota local');
    await user.click(screen.getByRole('button', { name: /paso 02/i }));
    expect(screen.getByLabelText(/unidad productora/i)).toHaveValue(datos.schoolCode);
    expect(screen.getByLabelText(/código de programa/i)).toHaveValue(datos.degreeProgramCode);
    expect(screen.getByLabelText(/código de asignatura/i)).toHaveValue(datos.subjectCode);
    await user.click(screen.getByRole('button', { name: /paso anterior/i }));
    expect(screen.getByLabelText(/título del expediente/i)).toHaveValue(datos.title);
  });

  test('guarda y recupera el borrador al volver a abrir Registro', async () => {
    const user = userEvent.setup();
    const { unmount } = await abrirRegistro();
    await completarClasificacion(user);
    await user.click(screen.getByRole('button', { name: /guardar borrador/i }));
    expect(JSON.parse(localStorage.getItem('sigesdoc:dossier-draft') ?? '{}')).toEqual(datos);
    unmount();
    await abrirRegistro();
    expect(screen.getByLabelText(/título del expediente/i)).toHaveValue(datos.title);
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByLabelText(/código de asignatura/i)).toHaveValue(datos.subjectCode);
  });

  test('cancela la radicación y elimina el borrador sin enviar datos', async () => {
    const user = userEvent.setup();
    const llamadas = stubApi({});
    await abrirRegistro();
    await completarClasificacion(user);
    await user.click(screen.getByRole('button', { name: /guardar borrador/i }));
    await user.click(screen.getByRole('button', { name: /cancelar radicación/i }));
    expect(screen.getByLabelText(/título del expediente/i)).toHaveValue('');
    expect(localStorage.getItem('sigesdoc:dossier-draft')).toBeNull();
    expect(llamadas).toHaveLength(0);
  });

  test.each(['bachelor', 'associate'])('envía solo el contrato B3 para nivel %s', async (nivel) => {
    const user = userEvent.setup();
    const llamadas = stubApi({
      'POST /api/v1/dossiers': dossier({ academicLevel: nivel as typeof datos.academicLevel }),
    });
    localStorage.setItem('sigesdoc:dossier-draft', JSON.stringify({ title: '' }));
    await abrirRegistro();
    await user.selectOptions(screen.getByLabelText(/nivel académico/i), nivel);
    await llegarAConfirmacion(user);
    await user.click(screen.getByRole('button', { name: /radicar expediente/i }));
    expect(
      await screen.findByText(/ECD-2026-0001 registrado correctamente en estado Recepcionado/i),
    ).toBeInTheDocument();
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]?.body).toEqual({ ...datos, academicLevel: nivel });
    expect(screen.getByRole('button', { name: /expediente registrado/i })).toBeDisabled();
    expect(localStorage.getItem('sigesdoc:dossier-draft')).toBeNull();
  });

  test('bloquea envíos duplicados mientras espera al servidor', async () => {
    const user = userEvent.setup();
    let resolver!: (response: Response) => void;
    const respuesta = new Promise<Response>((resolve) => {
      resolver = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(respuesta);
    vi.stubGlobal('fetch', fetchMock);
    await abrirRegistro();
    await llegarAConfirmacion(user);
    await user.click(screen.getByRole('button', { name: /radicar expediente/i }));
    const boton = screen.getByRole('button', { name: /registrando/i });
    expect(boton).toBeDisabled();
    await user.click(boton);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/dossiers'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    await act(async () => {
      resolver(json({ data: creado }, 201));
    });
    expect(await screen.findByRole('button', { name: /expediente registrado/i })).toBeDisabled();
  });

  test('un 422 conserva los datos y el borrador y permite reintentar con éxito', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json(
          {
            code: 'VALIDATION_FAILED',
            detail: 'Detalle interno',
            errors: [{ field: 'subjectCode', code: 'INVALID_FORMAT' }],
          },
          422,
          'application/problem+json',
        ),
      )
      .mockResolvedValueOnce(json({ data: creado }, 201));
    vi.stubGlobal('fetch', fetchMock);
    await abrirRegistro();
    await llegarAConfirmacion(user);
    await user.click(screen.getByRole('button', { name: /guardar borrador/i }));
    await user.click(screen.getByRole('button', { name: /radicar expediente/i }));
    expect(await screen.findByText('Revise los campos indicados.')).toBeInTheDocument();
    expect(screen.queryByText('Detalle interno')).not.toBeInTheDocument();
    expect(localStorage.getItem('sigesdoc:dossier-draft')).not.toBeNull();
    expect(screen.getByText(datos.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /radicar expediente/i }));
    expect(await screen.findByRole('button', { name: /expediente registrado/i })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('sigesdoc:dossier-draft')).toBeNull();
  });

  test('rechaza una respuesta de creación incompleta sin confirmar el registro', async () => {
    const user = userEvent.setup();
    stubApi({ 'POST /api/v1/dossiers': { dossierId: creado.dossierId } });
    await abrirRegistro();
    await llegarAConfirmacion(user);
    await user.click(screen.getByRole('button', { name: /radicar expediente/i }));
    expect(await screen.findByText(/respuesta no válida/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /radicar expediente/i })).toBeEnabled();
    expect(screen.queryByText(/radicación completada/i)).not.toBeInTheDocument();
  });

  test('sin dossiers.create no muestra el asistente ni envía solicitudes', async () => {
    const llamadas = stubApi({});
    renderApp(signedInBackend(especialista), '/expedientes/nuevo');
    expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continuar/i })).not.toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });
});
