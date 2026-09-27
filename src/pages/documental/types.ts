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
