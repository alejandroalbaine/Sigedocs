// ============================================================
// SIGESDOC - Módulo: Registro de observaciones
// ============================================================
// Este archivo asume que el backend (Node.js + PostgreSQL) expone:
//   GET  /api/expedientes        -> lista de expedientes para el <select>
//   GET  /api/observaciones      -> lista de observaciones ya registradas
//   POST /api/observaciones      -> registra una nueva observación
// ============================================================

const form = document.getElementById("formObservacion");
const mensajeDiv = document.getElementById("mensaje");
const selectExpediente = document.getElementById("expediente");
const tablaBody = document.querySelector("#tablaObservaciones tbody");
const inputFecha = document.getElementById("fecha");

document.addEventListener("DOMContentLoaded", () => {
  inputFecha.value = new Date().toISOString().split("T")[0];
  cargarExpedientes();
  cargarObservaciones();
});

async function cargarExpedientes() {
  try {
    const res = await fetch("/api/expedientes");
    if (!res.ok) throw new Error("No se pudieron cargar los expedientes");

    const expedientes = await res.json();

    expedientes.forEach((exp) => {
      const option = document.createElement("option");
      option.value = exp.id;
      option.textContent = exp.numero
        ? `${exp.numero} - ${exp.titulo || ""}`
        : exp.nombre || `Expediente #${exp.id}`;
      selectExpediente.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    mostrarMensaje("No se pudo cargar la lista de expedientes.", "error");
  }
}

async function cargarObservaciones() {
  try {
    const res = await fetch("/api/observaciones");
    if (!res.ok) throw new Error("No se pudieron cargar las observaciones");

    const observaciones = await res.json();
    renderTabla(observaciones);
  } catch (error) {
    console.error(error);
  }
}

function renderTabla(observaciones) {
  tablaBody.innerHTML = "";

  if (!observaciones.length) {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td colspan="5" style="text-align:center; color:#888;">
      Aún no hay observaciones registradas.
    </td>`;
    tablaBody.appendChild(fila);
    return;
  }

  observaciones.forEach((obs) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${escapeHtml(obs.expedienteNombre || obs.expedienteId)}</td>
      <td>${escapeHtml(obs.descripcion)}</td>
      <td>${escapeHtml(obs.estado)}</td>
      <td>${escapeHtml(obs.usuario)}</td>
      <td>${formatearFecha(obs.fecha)}</td>
    `;
    tablaBody.appendChild(fila);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    expedienteId: selectExpediente.value,
    descripcion: document.getElementById("descripcion").value.trim(),
    estado: document.getElementById("estado").value,
    usuario: document.getElementById("usuario").value.trim(),
    fecha: inputFecha.value,
  };

  if (!data.expedienteId || !data.descripcion || !data.usuario) {
    mostrarMensaje("Por favor completa todos los campos obligatorios.", "error");
    return;
  }

  const botonEnviar = form.querySelector('button[type="submit"]');
  botonEnviar.disabled = true;
  botonEnviar.textContent = "Registrando...";

  try {
    const res = await fetch("/api/observaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.mensaje || "Error al registrar la observación");
    }

    mostrarMensaje("Observación registrada correctamente.", "exito");
    form.reset();
    inputFecha.value = new Date().toISOString().split("T")[0];
    cargarObservaciones();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message || "Ocurrió un error al registrar la observación.", "error");
  } finally {
    botonEnviar.disabled = false;
    botonEnviar.textContent = "Registrar observación";
  }
});

function mostrarMensaje(texto, tipo) {
  mensajeDiv.textContent = texto;
  mensajeDiv.className = `mensaje ${tipo}`;
  mensajeDiv.hidden = false;

  setTimeout(() => {
    mensajeDiv.hidden = true;
  }, 5000);
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return "";
  const fecha = new Date(fechaISO);
  if (isNaN(fecha)) return fechaISO;
  return fecha.toLocaleDateString("es-VE");
}

function escapeHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}