/**
 * Contrato MVP de expedientes y flujo (SIGESDOC_BACKEND docs/endpoints.md §4–§9, ADR-013/014).
 * Cada respuesta se valida: si el backend cambia una forma, la interfaz muestra "respuesta no
 * válida" en lugar de fallar en silencio. Donde el contrato no fija la forma exacta (estado,
 * usuario u `Observation`), se aceptan las variantes razonables y se documenta en
 * docs/cumplimiento-contratos.md como pendiente de precisar por backend.
 */
import { ContractError } from './contract.ts';

export interface Dossier {
  dossierId: string;
  code: string;
  title: string;
  documentType: string;
  academicLevel: 'associate' | 'bachelor';
  schoolCode: string;
  degreeProgramCode: string;
  subjectCode: string;
  workflowId: string;
  currentState: { code: string; name: string; isEditable: boolean };
  currentVersion: { versionId: string; label: string };
  template: { templateId: string; templateVersionId: string };
  assignedSpecialist: { userId: string; name: string } | null;
  createdBy: { userId: string; name: string };
  createdAt: string;
}

export interface CreateDossierInput {
  title: string;
  academicLevel: Dossier['academicLevel'];
  schoolCode: string;
  degreeProgramCode: string;
  subjectCode: string;
}

export interface StateRef {
  code: string;
  name: string;
}

export interface UserRef {
  userId: string | null;
  name: string;
}

export interface DossierVersion {
  versionId: string;
  label: string;
  state: StateRef;
  createdBy: UserRef;
  createdAt: string;
  approvedAt: string | null;
}

export interface AvailableTransition {
  transitionId: string;
  code: string;
  name: string;
  toState: StateRef;
  requiresObservation: boolean;
}

export interface TransitionResult {
  historyId: string;
  fromState: StateRef;
  toState: StateRef;
  versionId: string;
  newVersionId: string | null;
  occurredAt: string;
}

export interface HistoryEntry {
  historyId: string;
  /** `null` en el registro inicial de la versión, que no proviene de una transición. */
  transition: StateRef | null;
  fromState: StateRef | null;
  toState: StateRef;
  versionLabel: string;
  user: UserRef;
  observation: string | null;
  occurredAt: string;
}

export interface Assignment {
  assignmentId: string;
  specialist: UserRef;
  assignedBy: UserRef;
  assignedAt: string;
}

export interface Observation {
  observationId: string;
  versionId: string | null;
  text: string;
  sectionKey: string | null;
  fieldKey: string | null;
  createdBy: UserRef | null;
  createdAt: string | null;
}

export const AUDIT_EVENT_TYPES = [
  'dossier_created',
  'version_created',
  'content_updated',
  'state_changed',
  'assigned',
  'observation_added',
] as const;

export interface AuditEvent {
  eventId: string;
  type: string;
  occurredAt: string;
  user: UserRef;
  versionLabel: string | null;
  summary: string;
}

export interface SpecialistOption {
  userId: string;
  name: string;
}

type Json = Record<string, unknown>;

function record(value: unknown, what: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError(what);
  }
  return value as Json;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new ContractError(what);
  return value;
}

function optionalText(value: unknown, what: string): string | null {
  if (value === undefined || value === null) return null;
  return text(value, what);
}

function list<T>(value: unknown, what: string, parse: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(value)) throw new ContractError(what);
  return value.map(parse);
}

/** Un estado puede llegar como código o como `{ code, name }`. */
export function parseStateRef(value: unknown, what: string): StateRef {
  if (typeof value === 'string') return { code: value, name: value };
  const state = record(value, what);
  const code = text(state.code ?? state.codigo, `${what}.code`);
  const name = state.name ?? state.nombre;
  return { code, name: typeof name === 'string' ? name : code };
}

/** Un usuario puede llegar como nombre o como `{ userId, name }`. */
export function parseUserRef(value: unknown, what: string): UserRef {
  if (typeof value === 'string') return { userId: null, name: value };
  const user = record(value, what);
  const id = user.userId ?? user.id;
  return {
    userId: typeof id === 'string' ? id : null,
    name: text(user.name ?? user.nombre, `${what}.name`),
  };
}

function idUser(value: unknown, what: string): { userId: string; name: string } {
  const user = record(value, what);
  return { userId: text(user.userId, `${what}.userId`), name: text(user.name, `${what}.name`) };
}

export function parseDossier(value: unknown, what = 'dossier'): Dossier {
  const item = record(value, what);
  const state = record(item.currentState, `${what}.currentState`);
  const version = record(item.currentVersion, `${what}.currentVersion`);
  const template = record(item.template, `${what}.template`);
  const level = text(item.academicLevel, `${what}.academicLevel`);
  if (level !== 'associate' && level !== 'bachelor') {
    throw new ContractError(`${what}.academicLevel`);
  }
  if (typeof state.isEditable !== 'boolean') throw new ContractError(`${what}.isEditable`);
  return {
    dossierId: text(item.dossierId, `${what}.dossierId`),
    code: text(item.code, `${what}.code`),
    title: text(item.title, `${what}.title`),
    documentType: text(item.documentType, `${what}.documentType`),
    academicLevel: level,
    schoolCode: text(item.schoolCode, `${what}.schoolCode`),
    degreeProgramCode: text(item.degreeProgramCode, `${what}.degreeProgramCode`),
    subjectCode: text(item.subjectCode, `${what}.subjectCode`),
    workflowId: text(item.workflowId, `${what}.workflowId`),
    currentState: {
      code: text(state.code, `${what}.currentState.code`),
      name: text(state.name, `${what}.currentState.name`),
      isEditable: state.isEditable,
    },
    currentVersion: {
      versionId: text(version.versionId, `${what}.currentVersion.versionId`),
      label: text(version.label, `${what}.currentVersion.label`),
    },
    template: {
      templateId: text(template.templateId, `${what}.template.templateId`),
      templateVersionId: text(template.templateVersionId, `${what}.template.templateVersionId`),
    },
    assignedSpecialist:
      item.assignedSpecialist === null || item.assignedSpecialist === undefined
        ? null
        : idUser(item.assignedSpecialist, `${what}.assignedSpecialist`),
    createdBy: idUser(item.createdBy, `${what}.createdBy`),
    createdAt: text(item.createdAt, `${what}.createdAt`),
  };
}

export const parseDossiers = (value: unknown) =>
  list(value, 'dossiers', (item, i) => parseDossier(item, `dossiers[${String(i)}]`));

export const parseVersions = (value: unknown): DossierVersion[] =>
  list(value, 'versions', (item, i) => {
    const v = record(item, `versions[${String(i)}]`);
    return {
      versionId: text(v.versionId, 'version.versionId'),
      label: text(v.label, 'version.label'),
      state: parseStateRef(v.state, 'version.state'),
      createdBy: parseUserRef(v.createdBy, 'version.createdBy'),
      createdAt: text(v.createdAt, 'version.createdAt'),
      approvedAt: optionalText(v.approvedAt, 'version.approvedAt'),
    };
  });

export const parseAvailableTransitions = (value: unknown): AvailableTransition[] =>
  list(value, 'available-transitions', (item, i) => {
    const t = record(item, `available-transitions[${String(i)}]`);
    if (typeof t.requiresObservation !== 'boolean') {
      throw new ContractError('transition.requiresObservation');
    }
    return {
      transitionId: text(t.transitionId, 'transition.transitionId'),
      code: text(t.code, 'transition.code'),
      name: text(t.name, 'transition.name'),
      toState: parseStateRef(t.toState, 'transition.toState'),
      requiresObservation: t.requiresObservation,
    };
  });

export function parseTransitionResult(value: unknown): TransitionResult {
  const r = record(value, 'transition-result');
  return {
    historyId: text(r.historyId, 'result.historyId'),
    fromState: parseStateRef(r.fromState, 'result.fromState'),
    toState: parseStateRef(r.toState, 'result.toState'),
    versionId: text(r.versionId, 'result.versionId'),
    newVersionId: optionalText(r.newVersionId, 'result.newVersionId'),
    occurredAt: text(r.occurredAt, 'result.occurredAt'),
  };
}

export const parseHistory = (value: unknown): HistoryEntry[] =>
  list(value, 'transitions', (item, i) => {
    const h = record(item, `transitions[${String(i)}]`);
    return {
      historyId: text(h.historyId, 'history.historyId'),
      transition:
        h.transition === null || h.transition === undefined
          ? null
          : parseStateRef(h.transition, 'history.transition'),
      fromState:
        h.fromState === null || h.fromState === undefined
          ? null
          : parseStateRef(h.fromState, 'history.fromState'),
      toState: parseStateRef(h.toState, 'history.toState'),
      versionLabel: text(h.versionLabel, 'history.versionLabel'),
      user: parseUserRef(h.user, 'history.user'),
      observation: optionalText(h.observation, 'history.observation'),
      occurredAt: text(h.occurredAt, 'history.occurredAt'),
    };
  });

export function parseAssignment(value: unknown, what = 'assignment'): Assignment {
  const a = record(value, what);
  return {
    assignmentId: text(a.assignmentId, `${what}.assignmentId`),
    specialist: parseUserRef(a.specialist, `${what}.specialist`),
    assignedBy: parseUserRef(a.assignedBy, `${what}.assignedBy`),
    assignedAt: text(a.assignedAt, `${what}.assignedAt`),
  };
}

export function parseObservation(value: unknown, what = 'observation'): Observation {
  const o = record(value, what);
  return {
    observationId: text(o.observationId ?? o.id, `${what}.observationId`),
    versionId: optionalText(o.versionId, `${what}.versionId`),
    text: text(o.text, `${what}.text`),
    sectionKey: optionalText(o.sectionKey, `${what}.sectionKey`),
    fieldKey: optionalText(o.fieldKey, `${what}.fieldKey`),
    createdBy:
      o.createdBy === undefined || o.createdBy === null
        ? null
        : parseUserRef(o.createdBy, `${what}.createdBy`),
    createdAt: optionalText(o.createdAt, `${what}.createdAt`),
  };
}

export const parseObservations = (value: unknown) =>
  list(value, 'observations', (item, i) => parseObservation(item, `observations[${String(i)}]`));

export const parseAuditEvents = (value: unknown): AuditEvent[] =>
  list(value, 'audit-events', (item, i) => {
    const e = record(item, `audit-events[${String(i)}]`);
    return {
      eventId: text(e.eventId, 'event.eventId'),
      type: text(e.type, 'event.type'),
      occurredAt: text(e.occurredAt, 'event.occurredAt'),
      user: parseUserRef(e.user, 'event.user'),
      versionLabel: optionalText(e.versionLabel, 'event.versionLabel'),
      summary: text(e.summary, 'event.summary'),
    };
  });

/**
 * `GET /users` no fija su forma en el contrato MVP; se aceptan `{ userId, name, roles? }`.
 * Si llegan roles, se conservan solo los especialistas curriculares (ADR-014, T2).
 */
export function parseSpecialists(value: unknown): SpecialistOption[] {
  const users = list(value, 'users', (item, i) => record(item, `users[${String(i)}]`));
  return users
    .filter((user) => {
      const roles = user.roles ?? user.roleCodes;
      if (!Array.isArray(roles)) return true;
      return roles.some((role: unknown) => {
        // `/users` devuelve `Role[]` ({ code }); se aceptan también códigos sueltos.
        const code =
          typeof role === 'object' && role !== null ? (role as { code?: unknown }).code : role;
        return code === 'CURRICULUM_SPECIALIST' || code === 'ESPECIALISTA_CURRICULAR';
      });
    })
    .map((user, i) => ({
      userId: text(user.userId ?? user.id, `users[${String(i)}].userId`),
      name: text(user.name ?? user.nombre, `users[${String(i)}].name`),
    }));
}
