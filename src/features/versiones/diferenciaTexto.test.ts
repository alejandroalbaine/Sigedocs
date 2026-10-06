import { diferenciaTexto, type Fragmento } from './diferenciaTexto.ts';

const unir = (fragmentos: readonly Fragmento[]) => fragmentos.map((f) => f.texto).join('');
const marcados = (fragmentos: readonly Fragmento[]) =>
  fragmentos.filter((f) => f.tipo !== 'igual').map((f) => `${f.tipo}:${f.texto}`);

test('marca solo las palabras que cambiaron y conserva ambos textos completos', () => {
  const antes = 'Analizar los modelos de datos relacionales.';
  const despues = 'Analizar y diseñar los modelos de datos distribuidos.';
  const { antes: a, despues: d } = diferenciaTexto(antes, despues);
  expect(unir(a)).toBe(antes);
  expect(unir(d)).toBe(despues);
  expect(marcados(a)).toEqual(['eliminado:relacionales']);
  expect(marcados(d)).toEqual(['agregado:y diseñar ', 'agregado:distribuidos']);
});

test('textos iguales no tienen marcas y uno vacío queda entero como agregado', () => {
  expect(marcados(diferenciaTexto('Igual', 'Igual').despues)).toEqual([]);
  const { antes, despues } = diferenciaTexto('', 'Texto nuevo');
  expect(antes).toEqual([]);
  expect(despues).toEqual([{ texto: 'Texto nuevo', tipo: 'agregado' }]);
});

test('respeta los saltos de línea', () => {
  const { despues } = diferenciaTexto('Uno\nDos', 'Uno\nDos\nTres');
  expect(unir(despues)).toBe('Uno\nDos\nTres');
  expect(marcados(despues)).toEqual(['agregado:\nTres']);
});

test('un texto enorme sin partes comunes se marca entero en lugar de bloquear la interfaz', () => {
  const antes = Array.from({ length: 2500 }, (_, i) => `a${String(i)}`).join(' ');
  const despues = Array.from({ length: 2500 }, (_, i) => `b${String(i)}`).join(' ');
  const resultado = diferenciaTexto(antes, despues);
  expect(resultado.antes).toEqual([{ texto: antes, tipo: 'eliminado' }]);
  expect(resultado.despues).toEqual([{ texto: despues, tipo: 'agregado' }]);
});

test('un texto largo con un cambio puntual marca solo esa palabra', () => {
  const palabras = Array.from({ length: 3000 }, (_, i) => `p${String(i)}`);
  const cambiado = palabras.map((palabra, i) => (i === 1500 ? 'nueva' : palabra));
  const { antes, despues } = diferenciaTexto(palabras.join(' '), cambiado.join(' '));
  expect(marcados(antes)).toEqual(['eliminado:p1500']);
  expect(marcados(despues)).toEqual(['agregado:nueva']);
});
