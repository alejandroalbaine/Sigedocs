import { parseTemplateVersion, type TemplateVersion } from '../../common/api/templateContract.ts';
import programaBackend from '../../test/fixtures/course-program-template.backend.json';
import { compararContenido, type CampoComparado, type Comparacion } from './comparacion.ts';

const plantilla = parseTemplateVersion(programaBackend);

function comparar(antes: Record<string, unknown>, despues: Record<string, unknown>) {
  return compararContenido({ plantilla, contenido: antes }, { plantilla, contenido: despues });
}

function campo(comparacion: Comparacion, seccion: string, clave: string): CampoComparado {
  const encontrado = comparacion.secciones
    .find((item) => item.key === seccion)
    ?.campos.find((item) => item.key === clave);
  if (!encontrado) throw new Error(`Falta ${seccion}.${clave}`);
  return encontrado;
}

const competencia = (
  itemId: string,
  codigo: string,
  texto: string,
  resultados: unknown[] = [],
) => ({
  itemId,
  codigo_competencia: codigo,
  competencia: texto,
  resultados_aprendizaje: resultados,
});

test('dos contenidos iguales no tienen cambios y conservan las 9 secciones en orden', () => {
  const contenido = { datos_academicos: { asignatura: 'Bases de Datos', creditos: 4 } };
  const resultado = comparar(contenido, structuredClone(contenido));
  expect(resultado.cambios).toBe(0);
  expect(resultado.seccionesConCambios).toBe(0);
  expect(resultado.secciones.map((seccion) => seccion.key)).toEqual([
    'datos_academicos',
    'descripcion_asignatura',
    'competencias_fundamentales',
    'competencias_especificas',
    'unidades_didacticas',
    'plan_evaluacion',
    'perfil_facilitador',
    'elaboracion_revision_validacion',
    'bibliografia',
  ]);
});

test('un contenido vacío ({}) equivale a campos vacíos, no a cambios', () => {
  const resultado = comparar(
    {},
    {
      datos_academicos: { asignatura: '', creditos: null, carreras: [], escuela: null },
      bibliografia: { referencias_bibliograficas: [] },
    },
  );
  expect(resultado.cambios).toBe(0);
});

test('distingue un campo completado, vaciado y modificado, con sus valores legibles', () => {
  const resultado = comparar(
    { datos_academicos: { asignatura: 'Bases de Datos', creditos: 3, prerrequisitos: 'INF-201' } },
    {
      datos_academicos: {
        asignatura: 'Bases de Datos Avanzadas',
        creditos: 3,
        bloque_formacion: 'Profesional',
      },
    },
  );
  expect(campo(resultado, 'datos_academicos', 'asignatura')).toMatchObject({
    etiqueta: 'Asignatura',
    tipo: 'modificado',
    antes: 'Bases de Datos',
    despues: 'Bases de Datos Avanzadas',
  });
  expect(campo(resultado, 'datos_academicos', 'creditos').tipo).toBe('igual');
  expect(campo(resultado, 'datos_academicos', 'prerrequisitos')).toMatchObject({
    tipo: 'eliminado',
    despues: '—',
  });
  expect(campo(resultado, 'datos_academicos', 'bloque_formacion')).toMatchObject({
    tipo: 'agregado',
    antes: '—',
  });
  expect(resultado.secciones[0]?.cambios).toBe(3);
  expect(resultado).toMatchObject({ cambios: 3, seccionesConCambios: 1 });
});

test('un texto modificado trae la diferencia por palabras', () => {
  const resultado = comparar(
    { descripcion_asignatura: { descripcion: 'Estudia modelos relacionales.' } },
    { descripcion_asignatura: { descripcion: 'Estudia modelos relacionales y NoSQL.' } },
  );
  const descripcion = campo(resultado, 'descripcion_asignatura', 'descripcion');
  expect(descripcion.tipo).toBe('modificado');
  expect(descripcion.texto?.despues.filter((f) => f.tipo === 'agregado')).toEqual([
    { texto: ' y NoSQL', tipo: 'agregado' },
  ]);
});

test('espacios en los extremos, saltos \\r\\n y números escritos como texto no son cambios', () => {
  const resultado = comparar(
    {
      descripcion_asignatura: { descripcion: 'Línea 1\r\nLínea 2 ' },
      datos_academicos: { creditos: 4 },
    },
    {
      descripcion_asignatura: { descripcion: 'Línea 1\nLínea 2' },
      datos_academicos: { creditos: '4' },
    },
  );
  expect(resultado.cambios).toBe(0);
});

test('los catálogos se comparan por value y la selección múltiple como conjunto', () => {
  const ing = { value: 'ESC-ING', label: 'Escuela de Ingeniería' };
  const isw = { value: 'ISW', label: 'Ingeniería en Software' };
  const sis = { value: 'SIS', label: 'Ingeniería en Sistemas' };
  const red = { value: 'RED', label: 'Redes' };
  const resultado = comparar(
    { datos_academicos: { escuela: ing, carreras: [isw, sis], caracter: 'OBLIGATORIA' } },
    {
      datos_academicos: {
        // La etiqueta guardada cambió, pero es la misma escuela.
        escuela: { ...ing, label: 'Escuela de Ingeniería y Tecnología' },
        carreras: [red, isw],
        caracter: 'ELECTIVA',
      },
    },
  );
  expect(campo(resultado, 'datos_academicos', 'escuela').tipo).toBe('igual');
  expect(campo(resultado, 'datos_academicos', 'carreras')).toMatchObject({
    tipo: 'modificado',
    antes: 'Ingeniería en Software, Ingeniería en Sistemas',
    despues: 'Redes, Ingeniería en Software',
    opciones: { agregadas: ['Redes'], quitadas: ['Ingeniería en Sistemas'] },
  });
  expect(campo(resultado, 'datos_academicos', 'caracter')).toMatchObject({
    tipo: 'modificado',
    antes: 'Obligatoria',
    despues: 'Electiva',
  });
  const reordenadas = comparar(
    { datos_academicos: { carreras: [isw, sis] } },
    { datos_academicos: { carreras: [sis, isw] } },
  );
  expect(campo(reordenadas, 'datos_academicos', 'carreras').tipo).toBe('igual');
});

test('los elementos de un grupo se emparejan por itemId: modificado, agregado y quitado', () => {
  const resultado = comparar(
    {
      competencias_fundamentales: {
        competencias_fundamentales: [
          competencia('cf1', 'CF1', 'Primera'),
          competencia('cf2', 'CF2', 'Segunda'),
          competencia('cf3', 'CF3', 'Tercera'),
        ],
      },
    },
    {
      competencias_fundamentales: {
        competencias_fundamentales: [
          competencia('cf1', 'CF1', 'Primera, revisada'),
          competencia('cf3', 'CF3', 'Tercera'),
          competencia('cf4', 'CF4', 'Nueva'),
        ],
      },
    },
  );
  const grupo = campo(resultado, 'competencias_fundamentales', 'competencias_fundamentales');
  expect(grupo).toMatchObject({ tipo: 'modificado', antes: '3 elementos', despues: '3 elementos' });
  expect(grupo.reordenado).toBeUndefined();
  expect(
    grupo.elementos?.map((item) => [
      item.itemId,
      item.tipo,
      item.posicionAntes,
      item.posicionDespues,
    ]),
  ).toEqual([
    ['cf1', 'modificado', 1, 1],
    ['cf2', 'eliminado', 2, null],
    ['cf3', 'igual', 3, 2],
    ['cf4', 'agregado', null, 3],
  ]);
  // Quitar cf2 corre a cf3 de lugar, pero no lo mueve respecto de los demás.
  expect(grupo.elementos?.some((item) => item.movido)).toBe(false);
  const primera = grupo.elementos?.[0];
  expect(primera?.resumen).toBe('CF1');
  expect(primera?.campos.find((item) => item.key === 'competencia')).toMatchObject({
    etiqueta: 'Competencia fundamental',
    tipo: 'modificado',
    antes: 'Primera',
    despues: 'Primera, revisada',
  });
});

test('un elemento movido sin cambios marca el grupo como reordenado, no como quitado y agregado', () => {
  const a = competencia('cf1', 'CF1', 'Primera');
  const b = competencia('cf2', 'CF2', 'Segunda');
  const resultado = comparar(
    { competencias_fundamentales: { competencias_fundamentales: [a, b] } },
    { competencias_fundamentales: { competencias_fundamentales: [b, a] } },
  );
  const grupo = campo(resultado, 'competencias_fundamentales', 'competencias_fundamentales');
  expect(grupo).toMatchObject({ tipo: 'modificado', reordenado: true });
  expect(grupo.elementos?.map((item) => [item.itemId, item.tipo, item.movido])).toEqual([
    ['cf2', 'igual', false],
    ['cf1', 'igual', true],
  ]);
  expect(resultado.cambios).toBe(1);
});

test('compara grupos anidados (resultados de aprendizaje dentro de cada competencia)', () => {
  const resultado = comparar(
    {
      competencias_fundamentales: {
        competencias_fundamentales: [
          competencia('cf1', 'CF1', 'Primera', [
            { itemId: 'r1', codigo_resultado: 'RA1', resultado: 'Diseña modelos.' },
          ]),
        ],
      },
    },
    {
      competencias_fundamentales: {
        competencias_fundamentales: [
          competencia('cf1', 'CF1', 'Primera', [
            { itemId: 'r1', codigo_resultado: 'RA1', resultado: 'Diseña y normaliza modelos.' },
            { itemId: 'r2', codigo_resultado: 'RA2', resultado: 'Optimiza consultas.' },
          ]),
        ],
      },
    },
  );
  const grupo = campo(resultado, 'competencias_fundamentales', 'competencias_fundamentales');
  const resultados = grupo.elementos?.[0]?.campos.find(
    (item) => item.key === 'resultados_aprendizaje',
  );
  expect(grupo.elementos?.[0]?.tipo).toBe('modificado');
  expect(resultados?.elementos?.map((item) => [item.itemId, item.tipo])).toEqual([
    ['r1', 'modificado'],
    ['r2', 'agregado'],
  ]);
});

test('sin itemId los elementos se emparejan por posición', () => {
  const resultado = comparar(
    { perfil_facilitador: { requisitos_perfil: [{ requisito: 'Maestría' }] } },
    { perfil_facilitador: { requisitos_perfil: [{ requisito: 'Maestría en Informática' }] } },
  );
  const grupo = campo(resultado, 'perfil_facilitador', 'requisitos_perfil');
  expect(grupo.elementos?.map((item) => item.tipo)).toEqual(['modificado']);
});

test('porcentajes y fechas se muestran como en el formulario de solo lectura', () => {
  const resultado = comparar(
    {
      plan_evaluacion: {
        componentes_evaluacion: [{ itemId: 'c1', componente: 'Foro', porcentaje: 40 }],
      },
      elaboracion_revision_validacion: { fecha_revision: '2026-09-01' },
    },
    {
      plan_evaluacion: {
        componentes_evaluacion: [{ itemId: 'c1', componente: 'Foro', porcentaje: 30 }],
      },
      elaboracion_revision_validacion: { fecha_revision: '2026-10-01' },
    },
  );
  const porcentaje = campo(
    resultado,
    'plan_evaluacion',
    'componentes_evaluacion',
  ).elementos?.[0]?.campos.find((item) => item.key === 'porcentaje');
  expect(porcentaje).toMatchObject({ tipo: 'modificado', antes: '40 %', despues: '30 %' });
  expect(campo(resultado, 'elaboracion_revision_validacion', 'fecha_revision')).toMatchObject({
    antes: '2026-09-01',
    despues: '2026-10-01',
  });
});

test('con plantillas distintas muestra las secciones y campos de ambas', () => {
  const posterior: TemplateVersion = {
    ...plantilla,
    templateVersionId: 'tv-2',
    sections: [
      ...plantilla.sections.filter((seccion) => seccion.key !== 'perfil_facilitador'),
      {
        sectionId: 's-nueva',
        key: 'recursos',
        title: 'Recursos',
        position: 9,
        isActive: true,
        isRequired: false,
        fields: [
          {
            fieldId: 'f-nuevo',
            key: 'enlaces',
            label: 'Enlaces',
            type: 'long_text',
            isRequired: false,
            position: 0,
          },
        ],
      },
    ],
  };
  const resultado = compararContenido(
    {
      plantilla,
      contenido: {
        perfil_facilitador: { requisitos_perfil: [{ itemId: 'p1', requisito: 'Maestría' }] },
      },
    },
    { plantilla: posterior, contenido: { recursos: { enlaces: 'https://uapa.edu.do' } } },
  );
  const claves = resultado.secciones.map((seccion) => seccion.key);
  expect(claves).toContain('recursos');
  expect(claves.at(-1)).toBe('perfil_facilitador');
  expect(campo(resultado, 'recursos', 'enlaces').tipo).toBe('agregado');
  expect(campo(resultado, 'perfil_facilitador', 'requisitos_perfil').tipo).toBe('eliminado');
});

test('las secciones inactivas no se comparan', () => {
  const inactiva: TemplateVersion = {
    ...plantilla,
    sections: plantilla.sections.map((seccion) =>
      seccion.key === 'bibliografia' ? { ...seccion, isActive: false } : seccion,
    ),
  };
  const resultado = compararContenido(
    { plantilla: inactiva, contenido: {} },
    {
      plantilla: inactiva,
      contenido: {
        bibliografia: { referencias_bibliograficas: [{ itemId: 'b1', referencia: 'x' }] },
      },
    },
  );
  expect(resultado.secciones.map((seccion) => seccion.key)).not.toContain('bibliografia');
  expect(resultado.cambios).toBe(0);
});

test('un itemId repetido no mezcla elementos distintos', () => {
  const resultado = comparar(
    { perfil_facilitador: { requisitos_perfil: [{ itemId: 'p1', requisito: 'Maestría' }] } },
    {
      perfil_facilitador: {
        requisitos_perfil: [
          { itemId: 'p1', requisito: 'Maestría' },
          { itemId: 'p1', requisito: 'Experiencia docente' },
        ],
      },
    },
  );
  const grupo = campo(resultado, 'perfil_facilitador', 'requisitos_perfil');
  expect(grupo.elementos?.map((item) => item.tipo)).toEqual(['igual', 'agregado']);
});

test('espacios repetidos o no separables dentro de una línea no cuentan como cambio', () => {
  const resultado = comparar(
    {
      descripcion_asignatura: { descripcion: 'Bases  de datos\u00a0relacionales \nSegunda línea' },
    },
    { descripcion_asignatura: { descripcion: 'Bases de datos relacionales\nSegunda línea' } },
  );
  expect(resultado.cambios).toBe(0);
  const conLinea = comparar(
    { descripcion_asignatura: { descripcion: 'Uno\nDos' } },
    { descripcion_asignatura: { descripcion: 'Uno\n\nDos' } },
  );
  expect(conLinea.cambios).toBe(1);
});
