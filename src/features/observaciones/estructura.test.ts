import { ContractError } from '../../common/api/contract.ts';
import { parseEstructura, ubicacion } from './estructura.ts';

const version = {
  templateVersionId: 'v1',
  sections: [
    {
      key: 'b',
      title: 'Segunda',
      position: 1,
      isActive: true,
      fields: [{ key: 'x', label: 'Equis', position: 0, help: null }],
    },
    { key: 'a', title: 'Primera', position: 0, isActive: true, fields: [] },
  ],
};

test('ordena por posición y acepta la versión en la raíz o anidada', () => {
  expect(parseEstructura(version).map((s) => s.key)).toEqual(['a', 'b']);
  expect(parseEstructura({ templateId: 't', version })).toEqual(parseEstructura(version));
});

test('rechaza una respuesta sin secciones', () => {
  expect(() => parseEstructura({ templateVersionId: 'v1' })).toThrow(ContractError);
});

test('muestra títulos y etiquetas; si no los conoce, las claves', () => {
  const estructura = parseEstructura(version);
  expect(ubicacion({ sectionKey: 'b', fieldKey: 'x' }, estructura)).toBe('Segunda · Equis');
  expect(ubicacion({ sectionKey: 'b', fieldKey: null }, estructura)).toBe('Segunda');
  expect(ubicacion({ sectionKey: 'z', fieldKey: 'q' }, null)).toBe('z · q');
  expect(ubicacion({ sectionKey: null, fieldKey: null }, estructura)).toBe('');
});
