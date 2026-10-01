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
  format?: string | null;
  help?: string | null;
  defaultValue?: unknown;
  options?: TemplateOption[];
  optionsSource?: {
    type: 'institutional_catalog';
    catalog: string;
  };
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

export interface TemplateMetadata {
  templateId: string;
  code: string;
  name: string;
  description: string | null;
  documentType: string;
  academicLevels: string[];
  latestVersionNumber: number | null;
  latestPublishedVersionNumber: number | null;
  createdAt: string;
}

export interface TemplateVersion {
  templateVersionId: string;
  templateId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'retired';
  validFrom?: string | null;
  validTo?: string | null;
  sections: TemplateSection[];
  rules?: TemplateRule[];
}

/**
 * Forma usada actualmente por el formulario.
 *
 * Se conserva para mantener compatibilidad con la plantilla de ejemplo
 * mientras el backend real entrega la metadata y la versión mediante
 * rutas separadas.
 */
export interface TemplateDefinition {
  templateId: string;
  code: string;
  name: string;
  description?: string;
  documentTypeId: string;
  academicLevels: string[];
  version: TemplateVersion;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return value;
}

function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return value;
}

function nullableText(value: unknown, path: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string') return value;

  throw new Error(`Plantilla fuera de contrato: ${path}`);
}

function parseOptions(value: unknown, path: string): TemplateOption[] | undefined {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return value.map((item, index) => {
    const option = record(item, `${path}[${String(index)}]`);

    return {
      value: text(option.value, `${path}[${String(index)}].value`),
      label: text(option.label, `${path}[${String(index)}].label`),
    };
  });
}

const RULE_SCOPES = ['field', 'section', 'document'] as const;
const RULE_TYPES = ['length', 'pattern', 'range', 'cardinality', 'sum_equals'] as const;

function parseRules(
  value: unknown,
  path: string,
  defaultScope: TemplateRule['scope'],
): TemplateRule[] | undefined {
  if (value === undefined || value === null) return undefined;

  if (!Array.isArray(value)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return value.flatMap((item, index) => {
    const where = `${path}[${String(index)}]`;
    const rule = record(item, where);
    const type = text(rule.type, `${where}.type`);

    if (!(RULE_TYPES as readonly string[]).includes(type)) {
      return [];
    }

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

    if (rule.target !== undefined && rule.target !== null) {
      parsed.target = record(rule.target, `${where}.target`);
    }

    return [parsed];
  });
}

function parseField(value: unknown, path: string, depth: number): TemplateField {
  const field = record(value, path);
  const type = text(field.type, `${path}.type`);

  if (!TEMPLATE_FIELD_TYPES.includes(type as TemplateFieldType)) {
    throw new Error(`Plantilla fuera de contrato: ${path}.type`);
  }

  const key = text(field.key, `${path}.key`);

  /*
   * Los campos principales del backend tienen fieldId, pero algunos campos
   * internos de grupos repetibles no. Para el frontend generamos un
   * identificador estable basado en su ubicación dentro de la plantilla.
   */
  const parsed: TemplateField = {
    fieldId: typeof field.fieldId === 'string' ? field.fieldId : `${path}.${key}`,
    key,
    label: text(field.label, `${path}.label`),
    type: type as TemplateFieldType,
    isRequired: boolean(field.isRequired, `${path}.isRequired`),
    position: number(field.position, `${path}.position`),
  };

  if (typeof field.isReadOnly === 'boolean') {
    parsed.isReadOnly = field.isReadOnly;
  }

  const format = nullableText(field.format, `${path}.format`);
  if (format !== undefined) parsed.format = format;

  const help = nullableText(field.help, `${path}.help`);
  if (help !== undefined) parsed.help = help;

  if ('defaultValue' in field) {
    parsed.defaultValue = field.defaultValue;
  }

  const options = parseOptions(field.options, `${path}.options`);
  if (options) parsed.options = options;

  if (field.optionsSource !== undefined && field.optionsSource !== null) {
    const source = record(field.optionsSource, `${path}.optionsSource`);

    if (source.type !== 'institutional_catalog') {
      throw new Error(`Plantilla fuera de contrato: ${path}.optionsSource.type`);
    }

    parsed.optionsSource = {
      type: 'institutional_catalog',
      catalog: text(source.catalog, `${path}.optionsSource.catalog`),
    };
  }

  if (field.config !== undefined && field.config !== null) {
    const config = record(field.config, `${path}.config`);
    parsed.config = {};

    if (typeof config.presentation === 'string') {
      if (!['table', 'blocks', 'list'].includes(config.presentation)) {
        throw new Error(`Plantilla fuera de contrato: ${path}.config.presentation`);
      }

      parsed.config.presentation = config.presentation as 'table' | 'blocks' | 'list';
    }

    if (typeof config.sortable === 'boolean') {
      parsed.config.sortable = config.sortable;
    }

    if (typeof config.addable === 'boolean') {
      parsed.config.addable = config.addable;
    }

    if (typeof config.removable === 'boolean') {
      parsed.config.removable = config.removable;
    }

    if (typeof config.decimals === 'number') {
      parsed.config.decimals = config.decimals;
    }

    if (config.fields !== undefined) {
      if (type !== 'repeatable_group' || !Array.isArray(config.fields) || depth >= 2) {
        throw new Error(`Plantilla fuera de contrato: ${path}.config.fields`);
      }

      parsed.config.fields = config.fields.map((child, index) =>
        parseField(child, `${path}.config.fields[${String(index)}]`, depth + 1),
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

function parseSections(value: unknown, path: string): TemplateSection[] {
  if (!Array.isArray(value)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return value.map((item, index) => {
    const sectionPath = `${path}[${String(index)}]`;
    const section = record(item, sectionPath);

    if (!Array.isArray(section.fields)) {
      throw new Error(`Plantilla fuera de contrato: ${sectionPath}.fields`);
    }

    const parsed: TemplateSection = {
      sectionId: text(section.sectionId, `${sectionPath}.sectionId`),
      key: text(section.key, `${sectionPath}.key`),
      title: text(section.title, `${sectionPath}.title`),
      position: number(section.position, `${sectionPath}.position`),
      isActive: boolean(section.isActive, `${sectionPath}.isActive`),
      isRequired: boolean(section.isRequired, `${sectionPath}.isRequired`),
      fields: section.fields.map((field, fieldIndex) =>
        parseField(field, `${sectionPath}.fields[${String(fieldIndex)}]`, 0),
      ),
    };

    if (typeof section.description === 'string') {
      parsed.description = section.description;
    }

    const rules = parseRules(section.rules, `${sectionPath}.rules`, 'section');

    if (rules) parsed.rules = rules;

    return parsed;
  });
}

function parseStatus(value: unknown, path: string): TemplateVersion['status'] {
  const status = text(value, path);

  if (!['draft', 'published', 'retired'].includes(status)) {
    throw new Error(`Plantilla fuera de contrato: ${path}`);
  }

  return status as TemplateVersion['status'];
}

/**
 * Respuesta real de:
 * GET /templates/{id}/versions/{versionId}
 *
 * El backend devuelve la versión directamente y `sections` está en la raíz.
 */

/**
 * Lee los metadatos generales de una plantilla desde GET /templates/{templateId}.
 */
export function parseTemplateMetadata(value: unknown): TemplateMetadata {
  const template = record(value, 'template');

  if (
    !Array.isArray(template.academicLevels) ||
    !template.academicLevels.every((item) => typeof item === 'string')
  ) {
    throw new Error('Plantilla fuera de contrato: template.academicLevels');
  }

  return {
    templateId: text(template.templateId, 'template.templateId'),
    code: text(template.code, 'template.code'),
    name: text(template.name, 'template.name'),
    description: nullableText(template.description, 'template.description') ?? null,
    documentType: text(template.documentType, 'template.documentType'),
    academicLevels: template.academicLevels,
    latestVersionNumber:
      template.latestVersionNumber === null
        ? null
        : number(template.latestVersionNumber, 'template.latestVersionNumber'),
    latestPublishedVersionNumber:
      template.latestPublishedVersionNumber === null
        ? null
        : number(template.latestPublishedVersionNumber, 'template.latestPublishedVersionNumber'),
    createdAt: text(template.createdAt, 'template.createdAt'),
  };
}

export function parseTemplateVersion(value: unknown): TemplateVersion {
  const version = record(value, 'templateVersion');

  const parsed: TemplateVersion = {
    templateVersionId: text(version.templateVersionId, 'templateVersion.templateVersionId'),
    templateId: text(version.templateId, 'templateVersion.templateId'),
    versionNumber: number(version.versionNumber, 'templateVersion.versionNumber'),
    status: parseStatus(version.status, 'templateVersion.status'),
    sections: parseSections(version.sections, 'templateVersion.sections'),
  };

  const validFrom = nullableText(version.validFrom, 'templateVersion.validFrom');

  if (validFrom !== undefined) {
    parsed.validFrom = validFrom;
  }

  const validTo = nullableText(version.validTo, 'templateVersion.validTo');

  if (validTo !== undefined) {
    parsed.validTo = validTo;
  }

  const rules = parseRules(version.rules, 'templateVersion.rules', 'document');

  if (rules) parsed.rules = rules;

  return parsed;
}

/**
 * Parser de la estructura anterior utilizada por el fixture del contrato.
 * Se conserva mientras existan pruebas y consumidores de esa estructura.
 */
export function parseTemplateDefinition(value: unknown): TemplateDefinition {
  const template = record(value, 'template');
  const version = record(template.version, 'template.version');

  if (
    !Array.isArray(template.academicLevels) ||
    !template.academicLevels.every((item) => typeof item === 'string')
  ) {
    throw new Error('Plantilla fuera de contrato: template.academicLevels');
  }

  const parsedVersion: TemplateVersion = {
    templateVersionId: text(version.templateVersionId, 'template.version.templateVersionId'),
    templateId: text(template.templateId, 'template.templateId'),
    versionNumber: number(version.versionNumber, 'template.version.versionNumber'),
    status: parseStatus(version.status, 'template.version.status'),
    sections: parseSections(version.sections, 'template.version.sections'),
  };

  const validFrom = nullableText(version.validFrom, 'template.version.validFrom');

  if (validFrom !== undefined) {
    parsedVersion.validFrom = validFrom;
  }

  const validTo = nullableText(version.validTo, 'template.version.validTo');

  if (validTo !== undefined) {
    parsedVersion.validTo = validTo;
  }

  const rules = parseRules(version.rules, 'template.version.rules', 'document');

  if (rules) parsedVersion.rules = rules;

  return {
    templateId: text(template.templateId, 'template.templateId'),
    code: text(template.code, 'template.code'),
    name: text(template.name, 'template.name'),
    ...(typeof template.description === 'string' ? { description: template.description } : {}),
    documentTypeId: text(template.documentTypeId, 'template.documentTypeId'),
    academicLevels: template.academicLevels,
    version: parsedVersion,
  };
}
