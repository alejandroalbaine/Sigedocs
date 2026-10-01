import { expect, test } from 'vitest';
import { datosRegistro, normalizarRegistro, validarRegistro } from './registro.ts';

const input = {
  title: 'Asignatura',
  academicLevel: 'bachelor' as const,
  schoolCode: 'ESC-ING',
  degreeProgramCode: 'ISW',
  subjectCode: 'ISW-201',
};

test('recupera un borrador sin propagar campos reservados al contrato', () => {
  expect(
    datosRegistro({
      ...input,
      code: 'inventado',
      actorId: 'otro',
      createdAt: 'ayer',
      academicLevel: 'doctoral',
    }),
  ).toEqual(input);
  expect(datosRegistro({ title: null, schoolCode: 4 }).title).toBe('');
  expect(datosRegistro(null).schoolCode).toBe('');
});

test('normaliza espacios sin agregar atributos al POST', () => {
  expect(normalizarRegistro({ ...input, title: ' Asignatura ', schoolCode: ' ESC-ING ' })).toEqual(
    input,
  );
});

test('el límite de título coincide con B3 (300 caracteres)', () => {
  expect(validarRegistro({ ...input, title: 'a'.repeat(300) }, 5)).toBe('');
  expect(validarRegistro({ ...input, title: 'a'.repeat(301) }, 1)).toMatch(/300/);
});

test.each(['schoolCode', 'degreeProgramCode', 'subjectCode'] as const)(
  'el límite de %s coincide con B3 (50 caracteres)',
  (field) => {
    expect(validarRegistro({ ...input, [field]: 'a'.repeat(50) }, 5)).toBe('');
    expect(validarRegistro({ ...input, [field]: 'a'.repeat(51) }, 2)).toMatch(/50/);
    expect(validarRegistro({ ...input, [field]: '  ' }, 5)).toMatch(/Complete los códigos/);
  },
);
