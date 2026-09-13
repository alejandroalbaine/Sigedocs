async function loadDashboard() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.status === 401) {
      window.location.replace('/');
      return;
    }
    if (!response.ok) throw new Error('No se pudo cargar la sesión.');
    const { user } = await response.json();
    document.querySelector('#user-name').textContent = user.name;
    document.querySelector('#user-role').textContent = user.role;
    const nameParts = user.name.trim().split(/\s+/);
    const honorifics = new Set(['Lic.', 'Dra.', 'Dr.', 'Ing.', 'Mtra.', 'Mtro.']);
    document.querySelector('#welcome-name').textContent = honorifics.has(nameParts[0])
      ? nameParts[1]
      : nameParts[0];
    document.querySelector('#user-initials').textContent = user.profile?.initials || user.name.slice(0, 1);

    const health = await fetch('/api/health');
    const healthBody = await health.json();
    const mode = healthBody.data?.mode === 'postgresql' ? 'PostgreSQL conectado' : 'Demostración local';
    document.querySelector('#data-mode').textContent = mode;
  } catch (error) {
    document.querySelector('#welcome-name').textContent = 'usuario';
    document.querySelector('#data-mode').textContent = error.message;
    document.querySelector('#data-mode').dataset.mode = 'error';
  }
}

document.querySelector('#logout-button').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.replace('/');
});

loadDashboard();
