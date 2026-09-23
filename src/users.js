import bcrypt from 'bcryptjs';

const demoPassword = 'UapaSecure2024*';
const demoHash = bcrypt.hashSync(demoPassword, 10);

export const dummyPasswordHash = bcrypt.hashSync('SigesdocInvalidPassword2026!', 10);

export const demoUsers = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'archivista.central@uapa.edu.do',
    passwordHash: demoHash,
    fullName: 'Lic. Mercedes Peña',
    role: 'Archivista / Gestor',
    isActive: true,
    profile: { unit: 'Archivo Central', initials: 'MP' },
    permissions: [
      'expedientes.consultar',
      'expedientes.consultar',
      'expedientes.crear',
      'expedientes.editar',
      'auditoria.consultar',
      'auditoria.consultar'
    ]
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    email: 'administrativo@uapa.edu.do',
    passwordHash: demoHash,
    fullName: 'Rafael Gómez',
    role: 'Administrativo',
    isActive: true,
    profile: { unit: 'Registro Académico', initials: 'RG' },
    permissions: ['expedientes.consultar', 'expedientes.consultar', 'expedientes.editar']
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    email: 'auditor.juridico@uapa.edu.do',
    passwordHash: demoHash,
    fullName: 'Dra. Carmen Rosario',
    role: 'Auditor Jurídico',
    isActive: true,
    profile: { unit: 'Consultoría Jurídica', initials: 'CR' },
    permissions: ['expedientes.consultar', 'expedientes.aprobar', 'auditoria.consultar', 'auditoria.consultar']
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    email: 'administrador@uapa.edu.do',
    passwordHash: demoHash,
    fullName: 'Jonathan Tejada',
    role: 'Administrador',
    isActive: true,
    profile: { unit: 'Tecnología de la Información', initials: 'JT' },
    permissions: [
      'expedientes.consultar',
      'expedientes.consultar',
      'expedientes.crear',
      'expedientes.aprobar',
      'expedientes.editar',
      'auditoria.consultar',
      'auditoria.consultar'
    ]
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    email: 'sin.permisos@uapa.edu.do',
    passwordHash: demoHash,
    fullName: 'Usuario de Prueba',
    role: 'Administrativo',
    isActive: true,
    profile: { unit: 'Sin unidad asignada', initials: 'UP' },
    permissions: []
  }
];

export function findDemoUser(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  return demoUsers.find((user) => user.email === normalizedEmail) || null;
}
