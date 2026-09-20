const $ = (selector) => document.querySelector(selector);
const PAGE_SIZE = 6;
let dashboard = null;
let monthlyChart = null;
let statusChart = null;
let currentPage = 1;
let tableQuery = "";
let currentUser = null;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function getInitials(name) {
  return String(name || "Usuario").trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "U";
}

function setAvatar(element, imageUrl, initials) {
  element.replaceChildren();
  if (!imageUrl) {
    element.textContent = initials;
    return;
  }
  const image = new Image();
  image.alt = "Foto de perfil";
  image.src = imageUrl;
  image.addEventListener("error", () => { element.replaceChildren(); element.textContent = initials; }, { once: true });
  element.append(image);
}

function closeProfileMenu() {
  $("#profileMenu").hidden = true;
  $("#profileMenuButton").setAttribute("aria-expanded", "false");
}

function openProfileDialog(title, content) {
  $("#profileDialogTitle").textContent = title;
  $("#profileDialogContent").innerHTML = `<div class="profile-dialog-body">${content}</div>`;
  $("#profileDialog").showModal();
}

function profileDataRows(includeJoined = false) {
  const profile = currentUser?.profile || {};
  const role = currentUser?.role || "Usuario institucional";
  const unit = profile.unit || "No disponible";
  const rows = [
    ["Nombre", currentUser?.name || "Usuario"],
    ["Correo institucional", currentUser?.email || "No disponible"],
    ["Rol", role],
    ["Unidad", unit]
  ];
  if (includeJoined) rows.push(["Fecha de ingreso", profile.joinedAt || "No disponible"]);
  return `<dl class="profile-data">${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
}

function openPhotoPreview(imageUrl) {
  const initials = (currentUser?.profile?.initials) || getInitials(currentUser?.name);
  const preview = imageUrl
    ? `<img class="profile-photo-preview" src="${escapeHtml(imageUrl)}" alt="Vista previa de la foto de perfil">`
    : `<div class="profile-photo-fallback">${escapeHtml(initials)}</div>`;
  openProfileDialog("Foto de perfil", `${preview}<p class="profile-preview-text">${imageUrl ? "Vista previa de la foto seleccionada." : "Aún no has seleccionado una foto."}</p><button class="profile-action-button" id="chooseProfilePhoto" type="button">Cambiar foto de perfil</button><p class="profile-note">La imagen se guarda de forma permanente cuando el backend habilite el perfil.</p>`);
  $("#chooseProfilePhoto").addEventListener("click", () => {
    $("#profileDialog").close();
    $("#profilePhotoInput").click();
  });
}

function openSecurityDialog() {
  openProfileDialog("Seguridad y contraseña", `
    <form class="security-form" id="securityForm">
      <label>Contraseña actual<input type="password" autocomplete="current-password" required></label>
      <label>Nueva contraseña<input type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Confirmar nueva contraseña<input type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="profile-action-button" type="submit">Actualizar contraseña</button>
    </form>
    <section class="two-factor-card">
      <div><strong>Autenticación en dos pasos</strong><span>Agrega un código de verificación al iniciar sesión.</span></div>
      <label class="switch"><input id="twoFactorToggle" type="checkbox"><span></span><b>Activar 2FA</b></label>
    </section>
    <p class="profile-note">Estas opciones requieren integración con el módulo de autenticación para aplicar los cambios de forma segura.</p>`);
  $("#securityForm").addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("El cambio de contraseña será habilitado por el módulo de autenticación.");
  });
  $("#twoFactorToggle").addEventListener("change", (event) => {
    event.target.checked = false;
    showToast("La activación de 2FA requiere el servicio de autenticación.");
  });
}

function handleProfileAction(action) {
  closeProfileMenu();
  const messages = {
    sessions: ["Actividad y sesiones", "Aquí se mostrarán el último acceso y las sesiones activas cuando el backend entregue esos datos."],
    preferences: ["Preferencias", "Idioma, formato de fecha, tamaño de texto y alto contraste se conectarán a las preferencias de la cuenta."],
    notifications: ["Notificaciones", "Aquí podrás elegir las alertas que deseas recibir dentro del sistema."],
    documents: ["Mis documentos recientes", "Esta sección mostrará documentos consultados o modificados por el usuario."],
    tasks: ["Mis tareas pendientes", "Esta sección mostrará documentos asignados para revisión, clasificación o aprobación."],
    history: ["Historial de acciones", "Esta sección mostrará acciones auditables realizadas por el usuario."]
  };
  if (action === "profile") return openProfileDialog("Mi perfil", `${profileDataRows()}<p class="profile-note">Los datos institucionales son administrados por la institución y no pueden modificarse desde este menú.</p>`);
  if (action === "institutional") return openProfileDialog("Datos institucionales", `${profileDataRows(true)}<p class="profile-note">Rol, unidad y correo institucional son de solo lectura.</p>`);
  if (action === "photo") return openPhotoPreview(currentUser?.profile?.photoUrl || currentUser?.profile?.avatarUrl);
  if (action === "password") return openSecurityDialog();
  const [title, message] = messages[action];
  openProfileDialog(title, `<p>${escapeHtml(message)}</p><p class="profile-note">Interfaz preparada; pendiente de integración con su módulo correspondiente.</p>`);
}

function updateDateTime() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const time = new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
  $("#current-date").textContent = date.charAt(0).toUpperCase() + date.slice(1);
  $("#current-time").textContent = time;
}

async function loadLoggedUser() {
  const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401) return window.location.replace("/");
  if (!response.ok) throw new Error("No se pudo cargar la sesión.");
  const { user = {} } = await response.json();
  const profile = user.profile || {};
  const name = user.name || "Usuario";
  const role = user.role || "Usuario institucional";
  const unit = profile.unit || role;
  currentUser = user;
  const initials = profile.initials || getInitials(name);
  const photoUrl = profile.photoUrl || profile.avatarUrl;
  $("#header-user-name").textContent = name;
  $("#header-user-unit").textContent = `${role} · ${unit}`;
  $("#welcome-name").textContent = name;
  setAvatar($("#user-avatar"), photoUrl, initials);
  setAvatar($("#profile-menu-avatar"), photoUrl, initials);
  $("#profile-menu-name").textContent = name;
  $("#profile-menu-role").textContent = `${role} · ${unit}`;
  $("#profile-menu-email").textContent = user.email || "Correo institucional no disponible";
  $("#user-unit-main").textContent = `${role} — ${unit}`;
}

function normalizeRow(row) {
  if (Array.isArray(row)) return row.slice(0, 5);
  return [row.code || row.codigo, row.title || row.titulo, row.series || row.serie, row.unit || row.unidad, row.responsible || row.responsable];
}

function activityRows() {
  return Array.isArray(dashboard?.activity) ? dashboard.activity.map(normalizeRow) : [];
}

function renderCards(cards = []) {
  $("#cards").innerHTML = cards.map((card) => `
    <article class="card tone-${escapeHtml(card.tone || "blue")}">
      <div class="card-label">${escapeHtml(card.label)}</div>
      <div class="card-title">${escapeHtml(card.title)}</div>
      <div class="card-icon" aria-hidden="true">${escapeHtml(card.icon || "▣")}</div>
      <div class="card-value">${escapeHtml(card.value ?? 0)}</div>
      <div class="card-detail">${escapeHtml(card.detail || "Sin datos disponibles")}</div>
    </article>`).join("");
}

function filteredActivity() {
  const query = tableQuery.trim().toLocaleLowerCase("es");
  return activityRows().filter((row) => row.join(" ").toLocaleLowerCase("es").includes(query));
}

function renderActivity() {
  const rows = filteredActivity();
  const maxPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, maxPage);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = rows.slice(start, start + PAGE_SIZE);
  $("#activityBody").innerHTML = visibleRows.length
    ? visibleRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell || "—")}</td>`).join("")}</tr>`).join("")
    : '<tr><td colspan="5" class="empty-state">Sin registros disponibles.</td></tr>';
  $("#activity-count").textContent = rows.length ? `Mostrando ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} de ${rows.length} registros` : "Mostrando 0 registros";
  $("#currentPage").textContent = String(currentPage);
  $("#previousPage").disabled = currentPage === 1;
  $("#nextPage").disabled = currentPage === maxPage;
}

function renderAlerts(alerts = []) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  $("#alerts").innerHTML = safeAlerts.length
    ? safeAlerts.map((alert) => `<article class="alert ${escapeHtml(alert.type || "info")}"><div class="alert-title"><span>${escapeHtml(alert.title)}</span><small>${escapeHtml(alert.tag || "")}</small></div><div class="alert-text">${escapeHtml(alert.text)}</div></article>`).join("")
    : '<div class="empty-state">No hay alertas registradas.</div>';
  const critical = safeAlerts.filter((alert) => alert.type === "danger").length;
  $("#critical-count").textContent = `${critical} Crítica${critical === 1 ? "" : "s"}`;
  $("#allAlerts").textContent = `Ver todas las ${safeAlerts.length} alertas ↗`;
}

function renderStatus(status = {}) {
  const labels = Array.isArray(status.labels) ? status.labels : [];
  const values = Array.isArray(status.values) ? status.values : [];
  const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const colors = ["status-dot-blue", "status-dot-orange", "status-dot-yellow", "status-dot-red"];
  $("#status-total").textContent = String(status.total ?? total);
  $("#status-caption").textContent = status.totalLabel || "TOTAL TRD";
  $("#statusList").innerHTML = labels.length
    ? labels.map((label, index) => `<div class="status-item"><i class="${colors[index % colors.length]}"></i><div><b>${escapeHtml(label)}</b>${escapeHtml(values[index] ?? 0)}${status.unit || "%"} del total</div></div>`).join("")
    : '<div class="empty-state">Sin estados disponibles.</div>';
}

function createCharts(data) {
  if (typeof Chart === "undefined") return showToast("No se pudo cargar el componente de gráficos.");
  const monthly = data.monthly || {};
  const status = data.status || {};
  if (monthlyChart) monthlyChart.destroy();
  if (statusChart) statusChart.destroy();
  monthlyChart = new Chart($("#monthlyChart"), {
    type: "bar",
    data: { labels: monthly.labels || [], datasets: [
      { label: "Planes de Estudio", data: monthly.received || [], backgroundColor: "#173b6c", borderRadius: 2, barPercentage: 0.72 },
      { label: "Reglamentos y Actas", data: monthly.registered || [], backgroundColor: "#f28c28", borderRadius: 2, barPercentage: 0.72 }
    ] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
  statusChart = new Chart($("#statusChart"), {
    type: "doughnut",
    data: { labels: status.labels || [], datasets: [{ data: status.values || [], backgroundColor: ["#263f70", "#ed8a2b", "#d9a02d", "#cf564c"], borderWidth: 3, borderColor: "#fff" }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false } } }
  });
  $("#monthly-period").textContent = monthly.period || "Histórico comparativo por tipología";
  $("#monthly-rate").textContent = monthly.rate ? `Tasa de radicación mensual: ${monthly.rate}` : "Tasa de radicación mensual: sin datos disponibles";
}

function renderDashboardEmptyState() {
  renderCards([]);
  renderActivity();
  renderAlerts([]);
  renderStatus({});
  createCharts({ monthly: {}, status: {} });
}

async function loadDashboard({ announce = false } = {}) {
  try {
    const response = await fetch("/api/dashboard", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return window.location.replace("/");
    if (!response.ok) throw new Error("No se pudieron cargar los datos del dashboard.");

    const data = await response.json();
    dashboard = data && typeof data === "object" ? data : {};

    renderCards(dashboard.cards || []);
    renderActivity();
    renderAlerts(dashboard.alerts || []);
    renderStatus(dashboard.status || {});
    createCharts(dashboard);
    if (announce) showToast("Dashboard actualizado.");
  } catch (error) {
    console.error("Error al actualizar el Dashboard:", error);

    // Si ya existen datos cargados, se mantienen en pantalla para no perder información.
    // Si es la primera carga, se muestran estados vacíos en lugar de datos incorrectos.
    if (!dashboard) {
      dashboard = { cards: [], activity: [], alerts: [], status: {}, monthly: {} };
      renderDashboardEmptyState();
    }

    showToast("No fue posible actualizar los datos. Intente nuevamente.");
    throw error;
  }
}

function exportActivity() {
  const rows = filteredActivity();
  if (!rows.length) return showToast("No hay registros para exportar.");
  const header = ["Código único", "Título del documento", "Serie documental", "Unidad de origen", "Responsable"];
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "reporte-dashboard-sigesdoc.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function setupInteractions() {
  $("#profileMenuButton").addEventListener("click", () => {
    const menu = $("#profileMenu");
    menu.hidden = !menu.hidden;
    $("#profileMenuButton").setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user")) closeProfileMenu();
  });
  document.querySelectorAll("[data-profile-action]").forEach((button) => button.addEventListener("click", () => handleProfileAction(button.dataset.profileAction)));
  $("#closeProfileDialog").addEventListener("click", () => $("#profileDialog").close());
  $("#profilePhotoInput").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const initials = (currentUser?.profile?.initials) || getInitials(currentUser?.name);
      currentUser.profile = currentUser.profile || {};
      currentUser.profile.photoUrl = reader.result;
      setAvatar($("#user-avatar"), reader.result, initials);
      setAvatar($("#profile-menu-avatar"), reader.result, initials);
      openPhotoPreview(reader.result);
    }, { once: true });
    reader.readAsDataURL(file);
    event.target.value = "";
  });
  $("#menuBtn").addEventListener("click", () => { $("#sidebar").classList.toggle("open"); $("#overlay").classList.toggle("show"); });
  $("#overlay").addEventListener("click", () => { $("#sidebar").classList.remove("open"); $("#overlay").classList.remove("show"); });
  $("#tableSearch").addEventListener("input", (event) => { tableQuery = event.target.value; currentPage = 1; renderActivity(); });
  $("#globalSearch").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    tableQuery = event.target.value;
    $("#tableSearch").value = tableQuery;
    currentPage = 1;
    renderActivity();
    document.querySelector(".activity-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#previousPage").addEventListener("click", () => { currentPage--; renderActivity(); });
  $("#nextPage").addEventListener("click", () => { currentPage++; renderActivity(); });
  $("#exportBtn").addEventListener("click", exportActivity);
  $(".refresh-btn").addEventListener("click", () => loadDashboard({ announce: true }).catch((error) => showToast(error.message)));
  $("#allAlerts").addEventListener("click", () => document.querySelector(".alerts-panel").scrollIntoView({ behavior: "smooth" }));
  $("#trdDetailButton").addEventListener("click", () => document.querySelector(".status-panel").scrollIntoView({ behavior: "smooth", block: "start" }));
  $("#supportButton").addEventListener("click", () => showToast("Soporte UAPA: módulo de atención pendiente de integración."));
  $("#notificationButton").addEventListener("click", () => showToast(`${dashboard?.alerts?.length || 0} alertas disponibles.`));
  $("#registerBtn").addEventListener("click", () => showToast("Registrar Documento será habilitado por el módulo correspondiente."));
  document.querySelectorAll(".nav-pending").forEach((button) => button.addEventListener("click", () => showToast(`${button.dataset.feature} será habilitado por su módulo correspondiente.`)));
  $("#logoutButton").addEventListener("click", async () => {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); }
    finally { window.location.replace("/"); }
  });
}

async function init() {
  updateDateTime();
  window.setInterval(updateDateTime, 1000);
  setupInteractions();
  try { await loadLoggedUser(); await loadDashboard(); }
  catch (error) { console.error(error); showToast(error.message); }
}

init();
