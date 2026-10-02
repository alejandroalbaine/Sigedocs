import type { Dossier } from '../pages/documental/types.ts';

function dossier(overrides: Partial<Dossier> & Pick<Dossier, 'dossierId' | 'code' | 'title'>) {
  const base: Dossier = {
    documentType: 'CURRICULUM_DESIGN',
    academicLevel: 'bachelor',
    schoolCode: 'ESC-ING',
    degreeProgramCode: 'PRG-SIS',
    subjectCode: 'MAT-101',
    workflowId: 'wf-1',
    currentState: { code: 'RECEIVED', name: 'Recibido', isEditable: true },
    currentVersion: { versionId: 'v1', label: 'v1' },
    template: { templateId: 't1', templateVersionId: 'tv1' },
    assignedSpecialist: null,
    createdBy: { userId: 'u1', name: 'Ana Pérez' },
    createdAt: '2026-09-25T14:00:00Z',
    ...overrides,
  };
  return base;
}

/** Expedientes con la forma de `GET /api/v1/dossiers`. */
export const expedientes: Dossier[] = [
  dossier({ dossierId: 'd1', code: 'EXP-2026-0001', title: 'Rediseño de Matemática I' }),
  dossier({
    dossierId: 'd2',
    code: 'EXP-2026-0002',
    title: 'Plan de Contabilidad',
    schoolCode: 'ESC-ADM',
    subjectCode: 'CON-201',
    currentState: { code: 'IN_REVIEW', name: 'En revisión', isEditable: false },
  }),
  dossier({
    dossierId: 'd3',
    code: 'EXP-2026-0003',
    title: 'Maestría en Educación',
    schoolCode: 'ESC-EDU',
    subjectCode: 'EDU-501',
    currentState: { code: 'FINAL', name: 'Final', isEditable: false },
  }),
];
