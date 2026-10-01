import type { CreateDossierInput } from '../documental/types.ts';

export function datosRegistro(value: unknown): CreateDossierInput {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const texto = (name: string) => (typeof raw[name] === 'string' ? raw[name] : '');
  return {
    title: texto('title'),
    academicLevel: raw.academicLevel === 'associate' ? 'associate' : 'bachelor',
    schoolCode: texto('schoolCode'),
    degreeProgramCode: texto('degreeProgramCode'),
    subjectCode: texto('subjectCode'),
  };
}

export function validarRegistro(form: CreateDossierInput, step: number): string {
  if (step === 1 || step === 5) {
    if (!form.title.trim()) return 'Complete el título del expediente.';
    if (form.title.trim().length > 300) return 'El título admite un máximo de 300 caracteres.';
  }
  if (step === 2 || step === 5) {
    const codes = [form.schoolCode, form.degreeProgramCode, form.subjectCode];
    if (codes.some((code) => !code.trim()))
      return 'Complete los códigos de unidad, programa y asignatura.';
    if (codes.some((code) => code.trim().length > 50))
      return 'Cada código admite un máximo de 50 caracteres.';
  }
  return '';
}

export function normalizarRegistro(form: CreateDossierInput): CreateDossierInput {
  return {
    title: form.title.trim(),
    academicLevel: form.academicLevel,
    schoolCode: form.schoolCode.trim(),
    degreeProgramCode: form.degreeProgramCode.trim(),
    subjectCode: form.subjectCode.trim(),
  };
}
