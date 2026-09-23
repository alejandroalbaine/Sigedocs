import { loadCurrentUser } from './session.js';

const checks = document.querySelectorAll('.check');
const progressBar = document.querySelector('#barra');
const counter = document.querySelector('#contador');
const notice = document.querySelector('#revision-notice');
const observations = document.querySelector('#observaciones');
const actionButtons = document.querySelectorAll('[data-review-action]');

function showNotice(message, kind = 'informacion') {
  notice.textContent = message;
  notice.dataset.kind = kind;
  notice.hidden = false;
}

function updateProgress() {
  const completed = document.querySelectorAll('.check:checked').length;
  const percentage = checks.length ? completed / checks.length * 100 : 0;
  progressBar.style.width = `${percentage}%`;
  counter.textContent = `${completed} de ${checks.length} requisitos verificados`;
}

function explainPendingAction(action) {
  if ((action === 'correction' || action === 'reject') && !observations.value.trim()) {
    showNotice('Escriba las observaciones antes de preparar esta decisión.', 'error');
    observations.focus();
    return;
  }
  if (action === 'approve' && document.querySelector('.check:not(:checked)')) {
    showNotice('Complete todos los requisitos antes de preparar la aprobación.', 'error');
    return;
  }
  showNotice('La revisión no se envió. Backend todavía debe publicar el contrato versionado para guardar esta operación.');
}

async function init() {
  checks.forEach((check) => check.addEventListener('change', updateProgress));
  actionButtons.forEach((button) => {
    button.addEventListener('click', () => explainPendingAction(button.dataset.reviewAction));
  });
  updateProgress();

  try {
    const { user, authorized } = await loadCurrentUser({ requiredPermission: 'expedientes.aprobar' });
    if (!user) return;
    document.querySelector('#reviewer-name').textContent = user.name;
    document.querySelector('#reviewer-role').textContent = (user.roles || []).join(', ');

    if (!authorized) {
      document.querySelector('#revision-content').hidden = true;
      showNotice('No tiene permiso para revisar expedientes.', 'error');
      return;
    }

    showNotice('Vista demostrativa: los datos del expediente no proceden de Backend y las decisiones no se guardan.');
  } catch (error) {
    document.querySelector('#revision-content').hidden = true;
    showNotice(error.message || 'No se pudo verificar la sesión.', 'error');
  }
}

init();
