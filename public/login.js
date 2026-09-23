import { api, ApiError } from './api.js';

const form = document.querySelector('#login-form');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const rememberInput = document.querySelector('#remember');
const submitButton = document.querySelector('#submit-button');
const alertBox = document.querySelector('#form-alert');
const togglePassword = document.querySelector('#toggle-password');
const modeBadge = document.querySelector('#mode-badge');
const demoSection = document.querySelector('#demo-section');
const dialog = document.querySelector('#info-dialog');
const dialogMessage = document.querySelector('#dialog-message');

const demoPassword = 'UapaSecure2024*';

function showAlert(message, kind = 'error') {
  alertBox.textContent = message;
  alertBox.dataset.kind = kind;
  alertBox.hidden = false;
}

function clearAlert() {
  alertBox.hidden = true;
  alertBox.textContent = '';
}

function clearFieldErrors() {
  for (const input of [emailInput, passwordInput]) input.removeAttribute('aria-invalid');
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle('loading', isLoading);
  submitButton.querySelector('span').textContent = isLoading ? 'Verificando credenciales…' : 'Iniciar sesión segura';
}

async function inspectServerMode() {
  try {
    const estado = await api.request('health');
    if (estado.mode === 'postgresql') {
      modeBadge.textContent = estado.connected ? 'PostgreSQL conectado' : 'PostgreSQL sin conexión';
      modeBadge.dataset.mode = estado.connected ? 'database' : 'error';
      demoSection.querySelector('.role-grid').hidden = true;
      emailInput.value = '';
      passwordInput.value = '';
    } else {
      modeBadge.textContent = 'Datos locales';
      modeBadge.dataset.mode = 'demo';
    }
  } catch (error) {
    modeBadge.textContent = 'Servidor sin conexión';
    modeBadge.dataset.mode = 'error';
    showAlert(error instanceof ApiError ? error.message : 'No se pudo consultar el estado del servidor.');
  }
}

document.querySelectorAll('.role-option').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.role-option').forEach((option) => {
      const selected = option === button;
      option.classList.toggle('active', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    emailInput.value = button.dataset.email;
    passwordInput.value = demoPassword;
    clearAlert();
    emailInput.focus();
  });
});

togglePassword.addEventListener('click', () => {
  const reveal = passwordInput.type === 'password';
  passwordInput.type = reveal ? 'text' : 'password';
  togglePassword.setAttribute('aria-pressed', String(reveal));
  togglePassword.setAttribute('aria-label', reveal ? 'Ocultar contraseña' : 'Mostrar contraseña');
  passwordInput.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert();
  clearFieldErrors();

  if (!form.checkValidity()) {
    form.reportValidity();
    showAlert('Complete correctamente el correo institucional y la contraseña.');
    return;
  }

  setLoading(true);
  try {
    // POST /api/v1/sessions → data = { sessionState, expiresAt, user: {...} } (ADR-005).
    const { user } = await api.request('login', {
      email: emailInput.value,
      password: passwordInput.value,
      remember: rememberInput.checked
    });

    showAlert(`Bienvenido/a, ${user.name}. Abriendo su panel…`, 'success');
    window.setTimeout(() => window.location.assign('/dashboard.html'), 500);
  } catch (error) {
    showAlert(error instanceof ApiError ? error.message : 'No se pudo iniciar sesión. Inténtelo de nuevo.');
    const firstInvalidField = error instanceof ApiError
      ? error.fieldErrors.map(({ field }) => form.elements.namedItem(field)).find(Boolean)
      : null;
    if (firstInvalidField) {
      for (const { field } of error.fieldErrors) form.elements.namedItem(field)?.setAttribute('aria-invalid', 'true');
      firstInvalidField.focus();
    } else {
      passwordInput.focus();
      passwordInput.select();
    }
  } finally {
    setLoading(false);
  }
});

document.querySelectorAll('[data-dialog-message]').forEach((button) => {
  button.addEventListener('click', () => {
    dialogMessage.textContent = button.dataset.dialogMessage;
    dialog.showModal();
  });
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

inspectServerMode();
