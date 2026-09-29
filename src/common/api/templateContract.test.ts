import programa from '../../test/fixtures/course-program-template.json';
import { expect, test } from 'vitest';
import { parseTemplateDefinition, TEMPLATE_FIELD_TYPES } from './templateContract.ts';

function field(type: string, position: number, extra: Record<string, unknown> = {}) {
  return {
    fieldId: `field-${position}`,
    key: `field_${position}`,
    label: `Campo ${position}`,
    type,
    isRequired: position === 1,
    position,
    ...extra,
  };
}

function definition(fields: unknown[]) {
  return {
    templateId: 'template-1',
    code: 'COURSE_PROGRAM',
    name: 'Programa de asignatura',
    documentTypeId: 'course-program',
    academicLevels: ['associate', 'bachelor', 'graduate'],
    version: {
      templateVersionId: 'version-1',
      versionNumber: 1,
      status: 'published',
      validFrom: '2026-01-01',
      validTo: null,
      sections: [
        {
          sectionId: 'section-1',
          key: 'datos',
          title: 'Datos académicos',
          position: 1,
          isActive: true,
          isRequired: true,
          fields,
        },
      ],
    },
  };
}

test('acepta los ocho tipos de campo del contrato de plantillas', () => {
  const fields = TEMPLATE_FIELD_TYPES.map((type, index) =>
    type === 'repeatable_group'
      ? field(type, index + 1, { config: { fields: [field('text', 1)] } })
      : field(type, index + 1),
  );
  const parsed = parseTemplateDefinition(definition(fields));
  expect(parsed.version.sections[0]?.fields.map(({ type }) => type)).toEqual(TEMPLATE_FIELD_TYPES);
});

test('conserva las opciones de catálogo como value y label', () => {
  const parsed = parseTemplateDefinition(
    definition([
      field('select', 1, {
        options: [{ value: 'OBLIGATORIA', label: 'Obligatoria' }],
      }),
    ]),
  );
  expect(parsed.version.sections[0]?.fields[0]?.options).toEqual([
    { value: 'OBLIGATORIA', label: 'Obligatoria' },
  ]);
});

test('rechaza un tercer nivel de grupo repetible', () => {
  const nested = field('repeatable_group', 1, {
    config: {
      fields: [
        field('repeatable_group', 1, {
          config: {
            fields: [field('repeatable_group', 1, { config: { fields: [field('text', 1)] } })],
          },
        }),
      ],
    },
  });
  expect(() => parseTemplateDefinition(definition([nested]))).toThrow(/config\.fields/);
});

test('acepta la plantilla real del Programa de Asignatura con sus reglas', () => {
  const plantilla = parseTemplateDefinition(programa);
  expect(plantilla.version.sections).toHaveLength(9);
  expect(plantilla.version.rules?.[0]).toMatchObject({ type: 'sum_equals', scope: 'document' });
  const competencias = plantilla.version.sections.find(
    (s) => s.key === 'competencias_fundamentales',
  );
  const grupo = competencias?.fields[0];
  expect(grupo?.type).toBe('repeatable_group');
  expect(grupo?.rules?.some((rule) => rule.type === 'cardinality')).toBe(true);
});
