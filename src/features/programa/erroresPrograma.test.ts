import programa from '../../test/fixtures/course-program-template.json';
import programaBackend from '../../test/fixtures/course-program-template.backend.json';
import { parseFieldErrors } from '../../common/api/contract.ts';
import {
  parseTemplateDefinition,
  parseTemplateVersion,
} from '../../common/api/templateContract.ts';
import { contenidoInicial } from './contenido.ts';
import {
  destinosPrograma,
  hallazgosServidor,
  idCampo,
  pertenece,
  ubicarHallazgos,
} from './erroresPrograma.ts';
import { conReglasOficiales } from './reglasOficiales.ts';
import { validarContenido } from './validacion.ts';

const plantilla = parseTemplateVersion(programaBackend);

test('conserva los mensajes por campo y nunca utiliza detail del problema', () => {
  const errores = parseFieldErrors([
    {
      field: 'content.datos_academicos.asignatura',
      code: 'REQUIRED',
      message: 'Complete la asignatura.',
    },
    { field: 'datos_academicos.creditos', code: 'REQUIRED', message: 17 },
  ]);
  expect(hallazgosServidor(errores)).toEqual([
    { ruta: 'datos_academicos.asignatura', mensaje: 'Complete la asignatura.', severidad: 'error' },
    {
      ruta: 'datos_academicos.creditos',
      mensaje: 'Complete este campo obligatorio.',
      severidad: 'error',
    },
  ]);
});

test('ubica errores desconocidos en el ancestro visible y conserva los globales', () => {
  const contenido = contenidoInicial(plantilla, {});
  const errores = hallazgosServidor([
    { field: 'datos_academicos.escuela.value', code: 'INVALID_OPTION' },
    { field: 'datos_academicos_extra', code: 'REQUIRED' },
    { field: 'content', code: 'INVALID_FORMAT' },
  ]);
  expect(
    ubicarHallazgos([...errores, ...errores], destinosPrograma(plantilla, contenido)).map(
      (item) => item.ruta,
    ),
  ).toEqual(['datos_academicos.escuela', 'datos_academicos_extra', 'content']);
  expect(pertenece('datos_academicos_extra', 'datos_academicos')).toBe(false);
  expect(idCampo('a.b')).not.toBe(idCampo('a_b'));
});

test.each([99, 101, 100])('la plantilla real comprueba la evaluación de %s %%', (porcentaje) => {
  const contenido = contenidoInicial(plantilla, {
    plan_evaluacion: { componentes_evaluacion: [{ itemId: 'e-1', porcentaje }] },
  });
  const errores = validarContenido(conReglasOficiales(plantilla, 'COURSE_PROGRAM'), contenido);
  expect(errores.some((item) => item.mensaje.includes('100 %'))).toBe(porcentaje !== 100);
});

test.each([9, 10, 11])('la plantilla real admite hasta 10 unidades: %s', (cantidad) => {
  const contenido = contenidoInicial(plantilla, {
    unidades_didacticas: {
      unidades_didacticas: Array.from({ length: cantidad }, (_, index) => ({
        itemId: `u-${String(index)}`,
      })),
    },
  });
  const errores = validarContenido(conReglasOficiales(plantilla, 'COURSE_PROGRAM'), contenido);
  expect(errores.some((item) => item.mensaje.includes('máximo 10'))).toBe(cantidad > 10);
});

test('no duplica las reglas oficiales recibidas ni las aplica a otra plantilla', () => {
  const completa = parseTemplateDefinition(programa).version;
  const adaptada = conReglasOficiales(completa, 'COURSE_PROGRAM');
  expect(adaptada.rules).toHaveLength(completa.rules?.length ?? 0);
  expect(conReglasOficiales(plantilla, 'OTHER_TEMPLATE')).toBe(plantilla);
});

test('evalúa sum_equals de sección con el mismo destino del grupo', () => {
  const contenido = contenidoInicial(plantilla, {
    plan_evaluacion: { componentes_evaluacion: [{ itemId: 'e1', porcentaje: 90 }] },
  });
  const completa = conReglasOficiales(plantilla, 'COURSE_PROGRAM');
  const suma = completa.rules?.find((item) => item.type === 'sum_equals');
  if (!suma) throw new Error('Falta regla de suma');
  const conReglaSeccion = {
    ...plantilla,
    sections: plantilla.sections.map((item) =>
      item.key === 'plan_evaluacion'
        ? {
            ...item,
            rules: [
              {
                ...suma,
                scope: 'section' as const,
                target: { fieldPath: ['componentes_evaluacion', 'porcentaje'] },
              },
            ],
          }
        : item,
    ),
  };
  expect(validarContenido(conReglaSeccion, contenido)).toContainEqual({
    ruta: 'plan_evaluacion.componentes_evaluacion',
    mensaje: `${suma.message} Suma actual: 90.`,
    severidad: 'error',
  });
});
