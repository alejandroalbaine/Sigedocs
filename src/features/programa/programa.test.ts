import programa from '../../test/fixtures/course-program-template.json';
import { parseTemplateDefinition } from '../../common/api/templateContract.ts';
import { contenidoInicial, mostrarValor, nuevoItem, type Item } from './contenido.ts';
import { sumar, validarContenido } from './validacion.ts';

const plantilla = parseTemplateDefinition(programa);
function seccion(key: string) {
  const encontrada = plantilla.version.sections.find((s) => s.key === key);
  if (!encontrada) throw new Error(`Sin sección ${key}`);
  return encontrada;
}

function primero<T>(lista: readonly T[] | undefined): T {
  const [item] = lista ?? [];
  if (item === undefined) throw new Error('Lista vacía');
  return item;
}

test('el contenido inicial tiene todas las secciones y respeta lo recibido', () => {
  const contenido = contenidoInicial(plantilla, { datos_academicos: { asignatura: 'ISW I' } });
  expect(Object.keys(contenido)).toHaveLength(9);
  expect(contenido.datos_academicos?.asignatura).toBe('ISW I');
  expect(contenido.competencias_fundamentales?.competencias_fundamentales).toEqual([]);
});

test('los elementos repetibles reciben itemId y sus subgrupos', () => {
  const grupo = primero(seccion('competencias_fundamentales').fields);
  const item = nuevoItem(grupo.config?.fields ?? []);
  expect(item.itemId).toMatch(/.+/);
  const subgrupo = grupo.config?.fields?.find((f) => f.type === 'repeatable_group');
  expect(item[subgrupo?.key ?? '']).toEqual([]);
});

test('un programa vacío incumple obligatorios y cardinalidad', () => {
  const hallazgos = validarContenido(plantilla, contenidoInicial(plantilla, {}));
  expect(hallazgos.some((h) => h.ruta === 'datos_academicos.asignatura')).toBe(true);
  expect(
    hallazgos.some(
      (h) => h.ruta.startsWith('competencias_fundamentales.') && /al menos/.test(h.mensaje),
    ),
  ).toBe(true);
});

test('el plan de evaluación debe sumar 100 %', () => {
  const contenido = contenidoInicial(plantilla, {});
  const grupo = primero(seccion('plan_evaluacion').fields);
  const componentes: Item[] = [60, 30].map((porcentaje) => ({
    ...nuevoItem(grupo.config?.fields ?? []),
    porcentaje,
  }));
  const plan = contenido.plan_evaluacion ?? {};
  plan[grupo.key] = componentes;
  contenido.plan_evaluacion = plan;
  expect(sumar(contenido, 'plan_evaluacion', ['componentes_evaluacion', 'porcentaje'])).toBe(90);
  expect(
    validarContenido(plantilla, contenido).find((h) => h.mensaje.includes('100 %'))?.mensaje,
  ).toMatch(/Suma actual: 90/);
  componentes.push({ ...nuevoItem(grupo.config?.fields ?? []), porcentaje: 10 });
  expect(validarContenido(plantilla, contenido).some((h) => h.mensaje.includes('100 %'))).toBe(
    false,
  );
});

test('muestra valores de catálogo, opciones y porcentajes en solo lectura', () => {
  const campo = primero(seccion('datos_academicos').fields.filter((f) => f.type === 'select'));
  expect(mostrarValor(campo, { value: 'x', label: 'Escuela X' })).toBe('Escuela X');
  expect(mostrarValor({ ...campo, type: 'boolean' }, true)).toBe('Sí');
});
