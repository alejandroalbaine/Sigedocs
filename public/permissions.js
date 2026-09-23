export function normalizePermissions(value) {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .filter((permission) => typeof permission === 'string')
      .map((permission) => permission.trim())
      .filter(Boolean)
  );
}

export function hasPermission(permissions, requiredPermission) {
  return normalizePermissions(permissions).has(requiredPermission);
}

export function applyPermissions(elements, permissions) {
  const effectivePermissions = normalizePermissions(permissions);
  let visibleOptions = 0;

  for (const element of elements) {
    const requiredPermission = element.dataset.permission;
    const visible = effectivePermissions.has(requiredPermission);
    element.hidden = !visible;
    if (visible) visibleOptions++;
  }

  return visibleOptions;
}
