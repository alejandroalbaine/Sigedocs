import { api, ApiError } from './api.js';
import { hasPermission } from './permissions.js';

export async function loadCurrentUser({ requiredPermission } = {}) {
  try {
    // GET /api/v1/users/current → data = { user: {...} } (ADR-005).
    const { user } = await api.request('me');
    return {
      user,
      authorized: !requiredPermission || hasPermission(user.permissions, requiredPermission)
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.replace('/');
      return { user: null, authorized: false };
    }
    throw error;
  }
}

export async function closeCurrentSession() {
  try {
    await api.request('logout');
    window.location.replace('/');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.replace('/');
      return;
    }
    throw error;
  }
}
