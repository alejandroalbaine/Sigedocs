export const TEMPLATE_FIELD_TYPES = [
  'text',
  'long_text',
  'number',
  'date',
  'boolean',
  'select',
  'multi_select',
  'repeatable_group',
] as const;

export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number];
export interface TemplateOption {
  value: string;
  label: string;
}
export interface TemplateRule {
  ruleId: string;
  code: string;
  scope: 'field' | 'section' | 'document';
  type: 'length' | 'pattern' | 'range' | 'cardinality' | 'sum_equals';
  target?: Record<string, unknown>;
  params: Record<string, unknown>;
  message: string;
  severity: 'error' | 'warning';
  isActive: boolean;
}
export interface TemplateField {
  fieldId: string;
  key: string;
  label: string;
  type: TemplateFieldType;
  isRequired: boolean;
  isReadOnly?: boolean;
  position: number;
  format?: string;
  help?: string;
  defaultValue?: unknown;
  options?: TemplateOption[];
  optionsSource?: { type: 'institutional_catalog'; catalog: string };
  config?: {
    presentation?: 'table' | 'blocks' | 'list';
    sortable?: boolean;
    addable?: boolean;
    removable?: boolean;
    decimals?: number;
    fields?: TemplateField[];
  };
  rules?: TemplateRule[];
}
export interface TemplateSection {
  sectionId: string;
  key: string;
  title: string;
  description?: string;
  position: number;
  isActive: boolean;
  isRequired: boolean;
  fields: TemplateField[];
  rules?: TemplateRule[];
}
export interface TemplateDefinition {
  templateId: string;
  code: string;
  name: string;
  description?: string;
  documentTypeId: string;
  academicLevels: string[];
  version: {
    templateVersionId: string;
    versionNumber: number;
    status: 'draft' | 'published' | 'retired';
    validFrom?: string | null;
    validTo?: string | null;
    sections: TemplateSection[];
    rules?: TemplateRule[];
  };
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }
  return value as Record<string, unknown>;
}
function text(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`Plantilla fuera de contrato: ${path}`);
  return value;
}
function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }
  return value;
}
function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Plantilla fuera de contrato: ${path}`);
  return value;
}

function parseOptions(value: unknown, path: string): TemplateOption[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`Plantilla fuera de contrato: ${path}`);
  return value.map((item, index) => {
    const option = record(item, `${path}[${index}]`);
    return {
      value: text(option.value, `${path}.value`),
      label: text(option.label, `${path}.label`),
    };
  });
}

const RULE_SCOPES = ['field', 'section', 'document'] as const;
const RULE_TYPES = ['length', 'pattern', 'range', 'cardinality', 'sum_equals'] as const;

/**
 * Reglas declarativas (§6). Las de tipo post-MVP (`visible_if`, `required_if`) se ignoran en el
 * cliente: el backend es la autoridad final (TPL-03).
 */
function parseRules(
  value: unknown,
  path: string,
  defaultScope: TemplateRule['scope'],
): TemplateRule[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`Plantilla fuera de contrato: ${path}`);
  return value.flatMap((item, index) => {
    const where = `${path}[${String(index)}]`;
    const rule = record(item, where);
    const type = text(rule.type, `${where}.type`);
    if (!(RULE_TYPES as readonly string[]).includes(type)) return [];
    // El §5 del contrato abrevia las reglas de campo a `{ type, params }`; el §6 da la forma
    // completa. Se aceptan ambas y se deduce el alcance por la ubicación de la regla.
    const scope = rule.scope === undefined ? defaultScope : text(rule.scope, `${where}.scope`);
    if (!(RULE_SCOPES as readonly string[]).includes(scope)) {
      throw new Error(`Plantilla fuera de contrato: ${where}.scope`);
    }
    const parsed: TemplateRule = {
      ruleId: typeof rule.ruleId === 'string' ? rule.ruleId : where,
      code: typeof rule.code === 'string' ? rule.code : type.toUpperCase(),
      scope: scope as TemplateRule['scope'],
      type: type as TemplateRule['type'],
      params: record(rule.params ?? {}, `${where}.params`),
      message: typeof rule.message === 'string' ? rule.message : '',
      severity: rule.severity === 'warning' ? 'warning' : 'error',
      isActive: rule.isActive !== false,
    };
    if (rule.target !== undefined) parsed.target = record(rule.target, `${where}.target`);
    return [parsed];
  });
}

function parseField(value: unknown, path: string, depth: number): TemplateField {
  const field = record(value, path);
  const type = text(field.type, `${path}.type`);
  if (!TEMPLATE_FIELD_TYPES.includes(type as TemplateFieldType)) {
    throw new Error(`Plantilla fuera de contrato: ${path}.type`);
  }
  const parsed: TemplateField = {
    fieldId: text(field.fieldId, `${path}.fieldId`),
    key: text(field.key, `${path}.key`),
    label: text(field.label, `${path}.label`),
    type: type as TemplateFieldType,
    isRequired: boolean(field.isRequired, `${path}.isRequired`),
    position: number(field.position, `${path}.position`),
  };
  if (typeof field.isReadOnly === 'boolean') parsed.isReadOnly = field.isReadOnly;
  if (typeof field.format === 'string') parsed.format = field.format;
  if (typeof field.help === 'string') parsed.help = field.help;
  if ('defaultValue' in field) parsed.defaultValue = field.defaultValue;
  const options = parseOptions(field.options, `${path}.options`);
  if (options) parsed.options = options;
  if (field.optionsSource !== undefined) {
    const source = record(field.optionsSource, `${path}.optionsSource`);
    if (source.type !== 'institutional_catalog') {
      throw new Error(`Plantilla fuera de contrato: ${path}.optionsSource.type`);
    }
    parsed.optionsSource = {
      type: 'institutional_catalog',
      catalog: text(source.catalog, `${path}.optionsSource.catalog`),
    };
  }
  if (field.config !== undefined) {
    const config = record(field.config, `${path}.config`);
    parsed.config = {};
    if (typeof config.presentation === 'string') {
      if (!['table', 'blocks', 'list'].includes(config.presentation)) {
        throw new Error(`Plantilla fuera de contrato: ${path}.config.presentation`);
      }
      parsed.config.presentation = config.presentation as 'table' | 'blocks' | 'list';
    }
    if (typeof config.sortable === 'boolean') parsed.config.sortable = config.sortable;
    if (typeof config.addable === 'boolean') parsed.config.addable = config.addable;
    if (typeof config.removable === 'boolean') parsed.config.removable = config.removable;
    if (typeof config.decimals === 'number') parsed.config.decimals = config.decimals;
    if (config.fields !== undefined) {
      if (type !== 'repeatable_group' || !Array.isArray(config.fields) || depth >= 2) {
        throw new Error(`Plantilla fuera de contrato: ${path}.config.fields`);
      }
      parsed.config.fields = config.fields.map((child, index) =>
        parseField(child, `${path}.config.fields[${index}]`, depth + 1),
      );
    }
  }
  if (type === 'repeatable_group' && !parsed.config?.fields) {
    throw new Error(`Plantilla fuera de contrato: ${path}.config.fields`);
  }
  const rules = parseRules(field.rules, `${path}.rules`, 'field');
  if (rules) parsed.rules = rules;
  return parsed;
}

export function parseTemplateDefinition(value: unknown): TemplateDefinition {
  const template = record(value, 'template');
  const version = record(template.version, 'template.version');
  if (
    !Array.isArray(template.academicLevels) ||
    !template.academicLevels.every((item) => typeof item === 'string')
  ) {
    throw new Error('Plantilla fuera de contrato: template.academicLevels');
  }
  if (!Array.isArray(version.sections)) {
    throw new Error('Plantilla fuera de contrato: template.version.sections');
  }
  const status = text(version.status, 'template.version.status');
  if (!['draft', 'published', 'retired'].includes(status)) {
    throw new Error('Plantilla fuera de contrato: template.version.status');
  }
  return {
    templateId: text(template.templateId, 'template.templateId'),
    code: text(template.code, 'template.code'),
    name: text(template.name, 'template.name'),
    ...(typeof template.description === 'string' ? { description: template.description } : {}),
    documentTypeId: text(template.documentTypeId, 'template.documentTypeId'),
    academicLevels: template.academicLevels,
    version: {
      templateVersionId: text(version.templateVersionId, 'template.version.templateVersionId'),
      versionNumber: number(version.versionNumber, 'template.version.versionNumber'),
      status: status as 'draft' | 'published' | 'retired',
      ...(version.validFrom === null || typeof version.validFrom === 'string'
        ? { validFrom: version.validFrom }
        : {}),
      ...(version.validTo === null || typeof version.validTo === 'string'
        ? { validTo: version.validTo }
        : {}),
      ...(version.rules === undefined
        ? {}
        : { rules: parseRules(version.rules, 'template.version.rules', 'document') ?? [] }),
      sections: version.sections.map((item, index) => {
        const section = record(item, `template.version.sections[${index}]`);
        if (!Array.isArray(section.fields)) {
          throw new Error(`Plantilla fuera de contrato: sections[${index}].fields`);
        }
        return {
          sectionId: text(section.sectionId, 'section.sectionId'),
          key: text(section.key, 'section.key'),
          title: text(section.title, 'section.title'),
          ...(typeof section.description === 'string' ? { description: section.description } : {}),
          position: number(section.position, 'section.position'),
          isActive: boolean(section.isActive, 'section.isActive'),
          isRequired: boolean(section.isRequired, 'section.isRequired'),
          ...(section.rules === undefined
            ? {}
            : {
                rules:
                  parseRules(section.rules, `sections[${String(index)}].rules`, 'section') ?? [],
              }),
          fields: section.fields.map((field, fieldIndex) =>
            parseField(field, `sections[${index}].fields[${fieldIndex}]`, 0),
          ),
        };
      }),
    },
  };
}
