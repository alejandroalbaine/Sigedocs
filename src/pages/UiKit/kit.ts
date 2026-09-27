/**
 * Datos de la Biblioteca UI. Los colores y la escala son los del documento base de Figma
 * (Versión Minimalista v.2); `token` apunta a la variable de `tokens.css` que los aplica.
 */
export const COLORES = [
  {
    grupo: 'Primarios',
    nombre: 'Azul institucional oscuro',
    hex: '#082A63',
    token: '--navy',
    uso: 'Menú, títulos, botón primario',
  },
  {
    grupo: 'Primarios',
    nombre: 'Azul interactivo',
    hex: '#0B67B2',
    token: '--blue',
    uso: 'Enlaces, selección activa',
  },
  {
    grupo: 'Primarios',
    nombre: 'Azul brillante',
    hex: '#1296DB',
    token: '--blue-bright',
    uso: 'Foco y gráficos (no para texto)',
  },
  {
    grupo: 'Acento',
    nombre: 'Naranja institucional',
    hex: '#F58220',
    token: '--orange',
    uso: 'Acción destacada, indicadores',
  },
  {
    grupo: 'Acento',
    nombre: 'Naranja oscuro',
    hex: '#C95E00',
    token: '--orange-strong',
    uso: 'Bordes e íconos de acento',
  },
  {
    grupo: 'Fondos',
    nombre: 'General',
    hex: '#F4F7FB',
    token: '--canvas',
    uso: 'Fondo de la aplicación',
  },
  {
    grupo: 'Fondos',
    nombre: 'Tarjetas',
    hex: '#FFFFFF',
    token: '--white',
    uso: 'Tarjetas, tablas y formularios',
  },
  {
    grupo: 'Fondos',
    nombre: 'Selecciones',
    hex: '#EAF4FC',
    token: '--nav-current',
    uso: 'Menú activo, filas seleccionadas',
  },
  {
    grupo: 'Semánticos',
    nombre: 'Éxito',
    hex: '#1B7F5A',
    token: '--success',
    uso: 'Aprobado, conforme',
  },
  {
    grupo: 'Semánticos',
    nombre: 'Advertencia',
    hex: '#9A6700',
    token: '--institutional-warning',
    uso: 'Requiere atención',
  },
  {
    grupo: 'Semánticos',
    nombre: 'Error',
    hex: '#B42318',
    token: '--danger',
    uso: 'Errores y acciones destructivas',
  },
] as const;

export const ESCALA_TIPOGRAFICA = [
  { clase: 'kitType28', ejemplo: 'Título de pantalla', descripcion: '28 px · Bold' },
  { clase: 'kitType18', ejemplo: 'Subtítulo de sección', descripcion: '18 px · Semibold' },
  { clase: 'kitType14', ejemplo: 'Texto general de la interfaz', descripcion: '14 px · Regular' },
  { clase: 'kitType12', ejemplo: 'ETIQUETA AUXILIAR', descripcion: '12 px · Etiquetas y ayudas' },
] as const;

export const TOKENS_EXPORTABLES = [
  ...COLORES.map((color) => color.token),
  '--on-accent',
  '--accent-text',
  '--font-sans',
  '--text-xs',
  '--text-md',
  '--text-lg',
  '--text-2xl',
  '--radius-sm',
  '--radius-md',
  '--institutional-shadow',
];

export const MINIMO_JUSTIFICACION = 30;
