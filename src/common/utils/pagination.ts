/** Cantidad de páginas para `total` elementos; siempre al menos 1. */
export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
