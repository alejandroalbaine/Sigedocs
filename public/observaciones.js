import { loadCurrentUser } from './session.js';

const requiredPermission = 'expedientes.editar';
const form = document.querySelector('#formObservacion');
const message = document.querySelector('#mensaje');
const tableBody = document.querySelector('#tablaObservaciones tbody');
const dateInput = document.querySelector('#fecha');
const userInput = document.querySelector('#usuario');

function showMessage(text, kind = 'error') {
  message.textContent = text;
  message.className = `mensaje ${kind}`;
  message.hidden = false;
}

function setFormEnabled(enabled) {
  for (const control of form.elements) control.disabled = !enabled;
}

function renderEmptyState(text) {
  tableBody.replaceChildren();
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 5;
  cell.className = 'module-empty-cell';
  cell.textContent = text;
  row.append(cell);
  tableBody.append(row);
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function init() {
  dateInput.value = localIsoDate();
  setFormEnabled(false);
  renderEmptyState('No hay observaciones disponibles porque Backend todavía no publicó este contrato.');

  try {
    const { user, authorized } = await loadCurrentUser({ requiredPermission });
    if (!user) return;
    userInput.value = user.name;

    if (!authorized) {
      showMessage('No tiene permiso para registrar observaciones.', 'error');
      return;
    }

    showMessage(
      'Interfaz disponible. El registro permanecerá deshabilitado hasta que Backend publique las rutas versionadas de expedientes y observaciones.',
      'informacion'
    );
  } catch (error) {
    showMessage(error.message || 'No se pudo verificar la sesión.', 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  showMessage('La observación no se envió porque el contrato correspondiente aún no está disponible.', 'informacion');
});

init();
