import { describe, expect, test } from 'vitest';
import { cuerpoObservacion, mapearObservacion, mapearObservaciones } from './observacionesContract.ts';
import { validarObservacion } from './types.ts';

const RESPUESTA_REAL = {
  observationId: 'bcf7ea08-7c9a-4865-8e6b-166615354276',
  dossierId: 'd0000000-0000-4000-8000-000000000003',
  version: { versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac', label: 'v1.0' },
  sectionKey: 'descripcion_asignatura',
  fieldKey: null,
  itemId: null,
  text: 'El objetivo general no precisa la unidad de los indicadores.',
  createdBy: { userId: '10000000-0000-4000-8000-000000000013', name: 'Especialista Curricular' },
  createdAt: '2026-10-01T15:42:45.514Z',
};

describe('mapearObservacion', () => {
  test('traduce la versión anidada y el autor del contrato', () => {
    expect(mapearObservacion(RESPUESTA_REAL)).toEqual({
      id: 'bcf7ea08-7c9a-4865-8e6b-166615354276',
      expedienteId: 'd0000000-0000-4000-8000-000000000003',
      version: { versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac', label: 'v1.0' },
      descripcion: 'El objetivo general no precisa la unidad de los indicadores.',
      autor: 'Especialista Curricular',
      autorId: '10000000-0000-4000-8000-000000000013',
      fecha: '2026-10-01T15:42:45.514Z',
      seccion: 'descripcion_asignatura',
    });
  });

  test('no inventa estado: el contrato no lo publica', () => {
    expect(mapearObservacion(RESPUESTA_REAL)).not.toHaveProperty('estado');
  });

  test('acepta sección, campo e ítem cuando el servidor los devuelve', () => {
    const mapeada = mapearObservacion({
      ...RESPUESTA_REAL,
      fieldKey: 'descripcion',
      itemId: '40e4b29d-5977-4ce3-ad10-6c4b540154f6',
    });
    expect(mapeada.campo).toBe('descripcion');
    expect(mapeada.itemId).toBe('40e4b29d-5977-4ce3-ad10-6c4b540154f6');
  });

  test('rechaza una forma fuera de contrato en vez de mostrar datos a medias', () => {
    expect(() => mapearObservacion({ ...RESPUESTA_REAL, version: null })).toThrow(
      /fuera de contrato/,
    );
    expect(() => mapearObservacion({ ...RESPUESTA_REAL, createdBy: null })).toThrow(
      /fuera de contrato/,
    );
    expect(() => mapearObservacion({ ...RESPUESTA_REAL, observationId: 'obs-001' })).toThrow(
      /fuera de contrato/,
    );
  });

  test('rechaza una lista que no sea lista', () => {
    expect(() => mapearObservaciones({ data: [] })).toThrow(/se esperaba una lista/);
  });
});

describe('cuerpoObservacion', () => {
  test('omite los opcionales que no tienen valor, porque el esquema es estricto', () => {
    expect(
      cuerpoObservacion({
        versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac',
        texto: '  Observación  ',
        seccion: 'descripcion_asignatura',
      }),
    ).toEqual({
      versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac',
      text: 'Observación',
      sectionKey: 'descripcion_asignatura',
    });
  });

  test('rechaza claves que el servidor no aceptaría', () => {
    expect(() =>
      cuerpoObservacion({
        versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac',
        texto: 'x',
        seccion: 'OBJETIVOS',
      }),
    ).toThrow(/minúsculas/);
  });
});

describe('validarObservacion', () => {
  test('exige versión y texto', () => {
    expect(validarObservacion({ versionId: '', texto: '   ' })).toEqual({
      versionId: 'Seleccione la versión a observar.',
      texto: 'Escriba la descripción de la observación.',
    });
  });

  test('exige sección cuando hay campo, y campo cuando hay ítem', () => {
    expect(
      validarObservacion({
        versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac',
        texto: 'x',
        campo: 'descripcion',
      }),
    ).toHaveProperty('campo');
    expect(
      validarObservacion({
        versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac',
        texto: 'x',
        seccion: 'descripcion_asignatura',
        itemId: 'abc',
      }),
    ).toHaveProperty('itemId');
  });

  test('admite un texto corto: el servidor solo exige un carácter', () => {
    expect(
      validarObservacion({
        versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac',
        texto: 'x',
      }),
    ).toEqual({});
  });

  test('rechaza texto por encima de 5000 caracteres', () => {
    expect(
      validarObservacion({
        versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac',
        texto: 'a'.repeat(5001),
      }),
    ).toHaveProperty('texto');
  });
});
