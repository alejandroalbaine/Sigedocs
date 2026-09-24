/** Hasta dos iniciales del nombre para el avatar; "U" si no hay nombre. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('es'))
    .join('');
  return letters || 'U';
}
