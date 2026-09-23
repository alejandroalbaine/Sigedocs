import { loadCurrentUser } from './session.js';

/**
 * Historial y trazabilidad | SIGESDOC
 * ------------------------------------------------------------------
 * Integración con el login (para que el encabezado muestre quién inició
 */

(function () {
  'use strict';

  var ACCIONES = [
    ['recibir_programa', 'Recibir programa'],
    ['asignar_especialista', 'Asignar especialista'],
    ['iniciar_revision', 'Iniciar revisión'],
    ['detectar_incumplimiento', 'Detectar incumplimiento'],
    ['persiste_incumplimiento', 'Persiste el incumplimiento'],
    ['requiere_cambios', 'Requiere cambios'],
    ['recibir_correccion', 'Recibir corrección'],
    ['iniciar_reevaluacion', 'Iniciar reevaluación'],
    ['aprobar_revision', 'Aprobar revisión'],
    ['aprobar_reevaluacion', 'Aprobar reevaluación'],
    ['publicar_pilotaje', 'Publicar pilotaje'],
    ['evaluar_pilotaje', 'Evaluar pilotaje'],
    ['cerrar_sin_cambios', 'Cerrar sin cambios'],
    ['implementar_programa', 'Implementar programa']
  ];

  var ESTADOS = [
    ['recepcionado', 'Recepcionado'],
    ['asignado', 'Asignado'],
    ['en_revision', 'En revisión'],
    ['requiere_ajustes', 'Requiere ajustes'],
    ['reenviado', 'Reenviado'],
    ['en_reevaluacion', 'En reevaluación'],
    ['aprobado_para_pilotaje', 'Aprobado para pilotaje'],
    ['en_pilotaje', 'En pilotaje'],
    ['evaluado', 'Evaluado'],
    ['definitivo', 'Definitivo'],
    ['implementado', 'Implementado']
  ];

  var ACCION_LABELS = {};
  ACCIONES.forEach(function (par) { ACCION_LABELS[par[0]] = par[1]; });
  var ESTADO_LABELS = {};
  ESTADOS.forEach(function (par) { ESTADO_LABELS[par[0]] = par[1]; });

  // Tono de color por acción/estado (igual paleta que la aplicación).
  var ACCION_TONE = {
    recibir_programa: 'blue', asignar_especialista: 'indigo', iniciar_revision: 'sky',
    detectar_incumplimiento: 'orange', persiste_incumplimiento: 'red', requiere_cambios: 'amber',
    recibir_correccion: 'violet', iniciar_reevaluacion: 'cyan', aprobar_revision: 'emerald',
    aprobar_reevaluacion: 'teal', publicar_pilotaje: 'green', evaluar_pilotaje: 'lime',
    cerrar_sin_cambios: 'slate', implementar_programa: 'dark'
  };
  var ESTADO_TONE = {
    recepcionado: 'slate', asignado: 'indigo', en_revision: 'sky', requiere_ajustes: 'orange',
    reenviado: 'violet', en_reevaluacion: 'cyan', aprobado_para_pilotaje: 'emerald',
    en_pilotaje: 'green', evaluado: 'lime', definitivo: 'slate', implementado: 'dark'
  };

  var ROLE_LABELS = {
    administrador: 'Administrador del Sistema',
    direccion_curricular: 'Dirección de Gestión y Desarrollo Curricular',
    especialista: 'Especialista Curricular',
    elaborador: 'Elaborador / Remitente'
  };

  // ------------------------------------------------------------------
  // Estado de la UI
  // ------------------------------------------------------------------
  var state = {
    filtros: { expediente: '', usuario: '', accion: 'all', estado: 'all', desde: '', hasta: '', texto: '' },
    page: 1,
    pageSize: 20,
    sort: { field: 'fecha', dir: 'desc' },
    items: [],
    total: 0,
    loading: false,
    selected: null
  };

  // Referencias DOM
  var $ = function (id) { return document.getElementById(id); };
  var tbody = $('tbody');
  var fExp = $('f-expediente'), fAccion = $('f-accion'), fEstado = $('f-estado'),
      fUsuario = $('f-usuario'), fDesde = $('f-desde'), fHasta = $('f-hasta'), fTexto = $('f-texto');

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function formatDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var dia = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return dia + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear() + ', ' + h + ':' + m;
  }

  function badge(value, toneMap, labelMap) {
    var tone = toneMap[value] || 'slate';
    var label = labelMap[value] || value;
    return '<span class="badge tone-' + tone + '">' + esc(label) + '</span>';
  }

  function estadoAnteriorNuevo(evento) {
    var hiper = '<span class="arrow" aria-hidden="true">→</span>';
    var antes = evento.estadoAnterior ? badge(evento.estadoAnterior, ESTADO_TONE, ESTADO_LABELS) : '<span class="muted">—</span>';
    var nuevo = badge(evento.estadoNuevo, ESTADO_TONE, ESTADO_LABELS);
    return '<span class="estado-cell">' + antes + hiper + nuevo + '</span>';
  }

  function esc(texto) {
    var div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
  }

  function cargarPagina(paginaNueva) {
    if (typeof paginaNueva === 'number') state.page = paginaNueva;
    state.loading = false;
    state.items = [];
    state.total = 0;
    $('module-notice').hidden = false;
    $('module-notice').textContent = 'La interfaz está integrada con la sesión, pero Backend todavía no ha publicado el contrato versionado de trazabilidad.';
    pintar();
  }

  // ------------------------------------------------------------------
  // Pintado
  // ------------------------------------------------------------------
  function pintar() {
    $('loading').hidden = !state.loading;
    $('pagination').hidden = state.loading && state.total === 0;

    if (state.items.length === 0) {
      $('empty').hidden = false;
      $('table-scroll').hidden = true;
      $('pagination').hidden = true;
    } else {
      $('empty').hidden = true;
      $('table-scroll').hidden = false;
      $('pagination').hidden = false;
    }

    tbody.innerHTML = state.items.map(function (evento) {
      return (
        '<tr class="fila" data-id="' + esc(evento.id) + '">' +
          '<td>' + esc(formatDateTime(evento.fecha)) + '</td>' +
          '<td>' + badge(evento.accion, ACCION_TONE, ACCION_LABELS) + '</td>' +
          '<td><span class="celda-titulo">' + esc(evento.expedienteCodigo) + '</span>' +
              '<span class="celda-sub" title="' + esc(evento.expedienteTitulo) + '">' + esc(evento.expedienteTitulo) + '</span></td>' +
          '<td><span class="celda-titulo">' + esc(evento.usuarioNombre) + '</span>' +
              '<span class="celda-sub">' + esc(evento.usuarioCorreo) + '</span></td>' +
          '<td>' + esc(ROLE_LABELS[evento.usuarioRol] || evento.usuarioRol) + '</td>' +
          '<td><code>' + esc(evento.version) + '</code></td>' +
          '<td>' + estadoAnteriorNuevo(evento) + '</td>' +
          '<td>' + evidencia(evento) + '</td>' +
        '</tr>'
      );
    }).join('');

    pintarOrden();
    pintarPaginacion();
  }

  function evidencia(evento) {
    if (!evento.evidencia) return '<span class="muted">—</span>';
    return '<code class="evidencia" title="' + esc(evento.evidencia) + '">' + esc(evento.evidencia) + '</code>';
  }

  function pintarOrden() {
    Array.prototype.forEach.call(document.querySelectorAll('#encabezados th.sortable'), function (th) {
      var flecha = th.querySelector('.sort-arrow');
      if (th.dataset.sort === state.sort.field) {
        flecha.textContent = state.sort.dir === 'asc' ? '▲' : '▼';
      } else {
        flecha.textContent = '↕';
      }
    });
  }

  function pintarPaginacion() {
    var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    var desde = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    var hasta = Math.min(state.page * state.pageSize, state.total);
    $('pg-summary').textContent = 'Mostrando ' + desde + '–' + hasta + ' de ' + state.total + ' eventos';
    $('pg-page').textContent = 'Página ' + state.page + ' de ' + totalPages;
    $('pg-prev').disabled = state.page <= 1;
    $('pg-next').disabled = state.page >= totalPages;
  }

  // ------------------------------------------------------------------
  // Detalle del evento
  // ------------------------------------------------------------------
  function abrirDetalle(evento) {
    state.selected = evento;
    $('det-accion-badge').outerHTML =
      '<span class="badge tone-' + (ACCION_TONE[evento.accion] || 'slate') + '" id="det-accion-badge">' +
      esc(ACCION_LABELS[evento.accion] || evento.accion) + '</span>';
    var badgeDet = $('det-accion-badge');
    $('det-expediente').innerHTML = '<strong>' + esc(evento.expedienteTitulo) + '</strong><small><code>' + esc(evento.expedienteCodigo) + '</code></small>';
    $('det-fecha').textContent = formatDateTime(evento.fecha);
    $('det-usuario').innerHTML = '<strong>' + esc(evento.usuarioNombre) + '</strong><small>' + esc(evento.usuarioCorreo) + '</small>';
    $('det-rol').textContent = ROLE_LABELS[evento.usuarioRol] || evento.usuarioRol;
    $('det-accion').textContent = ACCION_LABELS[evento.accion] || evento.accion;
    $('det-version').innerHTML = '<code>' + esc(evento.version) + '</code>';
    $('det-estado').innerHTML = estadoAnteriorNuevo(evento);
    $('det-observacion').textContent = evento.observacion || 'Sin observaciones';
    $('det-evidencia').innerHTML = evento.evidencia ? '<code>' + esc(evento.evidencia) + '</code>' : '<span class="muted">—</span>';
    $('det-registro').textContent = '#' + evento.id;
    $('detalle').hidden = false;
    $('drawer-overlay').hidden = false;
  }

  function cerrarDetalle() {
    state.selected = null;
    $('detalle').hidden = true;
    $('drawer-overlay').hidden = true;
  }

  // ------------------------------------------------------------------
  // Eventos
  // ------------------------------------------------------------------
  function aplicarFiltros() {
    state.filtros.expediente = fExp.value;
    state.filtros.usuario = fUsuario.value;
    state.filtros.accion = fAccion.value;
    state.filtros.estado = fEstado.value;
    state.filtros.desde = fDesde.value;
    state.filtros.hasta = fHasta.value;
    state.filtros.texto = fTexto.value;
    state.page = 1;
    cargarPagina(1);
  }

  // Selectores iniciales de acción y estado
  ACCIONES.forEach(function (par) {
    var op = document.createElement('option');
    op.value = par[0];
    op.textContent = par[1];
    fAccion.appendChild(op);
  });
  ESTADOS.forEach(function (par) {
    var op = document.createElement('option');
    op.value = par[0];
    op.textContent = par[1];
    fEstado.appendChild(op);
  });

  $('filtros').addEventListener('submit', function (e) {
    e.preventDefault();
    aplicarFiltros();
  });

  // Aplicación inmediata al cambiar select o fecha
  [fAccion, fEstado, fDesde, fHasta].forEach(function (el) {
    el.addEventListener('change', aplicarFiltros);
  });

  $('limpiar').addEventListener('click', function () {
    fExp.value = ''; fUsuario.value = ''; fAccion.value = 'all';
    fEstado.value = 'all'; fDesde.value = ''; fHasta.value = ''; fTexto.value = '';
    aplicarFiltros();
  });

  // Ordenamiento por columna
  document.querySelectorAll('#encabezados th.sortable').forEach(function (th) {
    th.addEventListener('click', function () {
      var campo = th.dataset.sort;
      if (state.sort.field === campo) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.field = campo;
        state.sort.dir = 'asc';
      }
      state.page = 1;
      cargarPagina(1);
    });
  });

  // Paginación
  $('pg-prev').addEventListener('click', function () { if (state.page > 1) cargarPagina(state.page - 1); });
  $('pg-next').addEventListener('click', function () {
    if (state.page < Math.ceil(state.total / state.pageSize)) cargarPagina(state.page + 1);
  });
  $('pg-size').addEventListener('change', function () {
    state.pageSize = Number(this.value);
    state.page = 1;
    cargarPagina(1);
  });

  // Clic en fila → detalle
  tbody.addEventListener('click', function (e) {
    var fila = e.target.closest('tr.fila');
    if (!fila) return;
    var evento = state.items.find(function (ev) { return String(ev.id) === fila.dataset.id; });
    if (evento) abrirDetalle(evento);
  });

  $('detalle-cerrar').addEventListener('click', cerrarDetalle);
  $('drawer-overlay').addEventListener('click', cerrarDetalle);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('detalle').hidden) cerrarDetalle();
  });

  // Menú lateral: contraer / expandir (que salga y entre)
  $('menu-toggle').addEventListener('click', function () {
    var shellEl = $('shell');
    var contraido = shellEl.classList.toggle('collapsed');
    this.setAttribute('aria-expanded', String(!contraido));
  });

  // ------------------------------------------------------------------
  // Inicio
  // ------------------------------------------------------------------
  async function iniciar() {
    try {
      var session = await loadCurrentUser({ requiredPermission: 'auditoria.consultar' });
      if (!session.user) return;
      $('user-badge').textContent = session.user.name;
      if (!session.authorized) {
        $('module-notice').hidden = false;
        $('module-notice').textContent = 'No tiene permiso para consultar la trazabilidad.';
        $('filtros').hidden = true;
        state.items = [];
        state.total = 0;
        pintar();
        return;
      }
      cargarPagina(1);
    } catch (error) {
      $('module-notice').hidden = false;
      $('module-notice').textContent = error.message || 'No se pudo verificar la sesión.';
    }
  }

  iniciar();
})();
