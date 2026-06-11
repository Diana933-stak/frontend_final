import { ApiClient, ApiError } from '../../services/ApiClient.js';
import { AuthService } from '../../services/AuthService.js';
import { ConductoresService } from '../../services/ConductoresService.js';
import { VehiculosService } from '../../services/VehiculosService.js';
import { RutasService } from '../../services/RutasService.js';
import { ViajesService } from '../../services/ViajesService.js';
import {
  badge,
  buildForm,
  emptyState,
  escapeHtml,
  handleError,
  modal,
  normalizeDate,
  qs,
  qsa,
  redirectToLogin,
  requireSession,
  serializeForm,
  toast,
  withLoading
} from './ui.js';

const TITLES = {
  dashboard: 'Dashboard',
  conductores: 'Conductores',
  vehiculos: 'Vehiculos',
  rutas: 'Rutas',
  programaciones: 'Programaciones',
  viajes: 'Viajes y seguimiento'
};

const ESTADOS_CONDUCTOR = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_ruta', label: 'En ruta' },
  { value: 'inactivo', label: 'Inactivo' }
];

const ESTADOS_VEHICULO = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_ruta', label: 'En ruta' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'inactivo', label: 'Inactivo' }
];

const ESTADOS_VIAJE = [
  { value: '', label: 'Todos los estados' },
  { value: 'programado', label: 'Programado' },
  { value: 'en_transito', label: 'En transito' },
  { value: 'retrasado', label: 'Retrasado' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' }
];

const EXPECTED_SERVICES = {
  auth: 'ms-auth',
  conductores: 'ms-conductores',
  vehiculos: 'ms-vehiculos',
  rutas: 'ms-rutas',
  viajes: 'ms-viajes'
};

class LogiTransApp {
  constructor() {
    this.content = qs('#app-content');
    this.title = qs('#page-title');
    this.sidebar = qs('#sidebar');
    this.state = {
      view: 'dashboard',
      conductores: [],
      vehiculos: [],
      rutas: [],
      programaciones: [],
      historial: []
    };
    this.filters = {
      conductores: {},
      vehiculos: {},
      rutas: {},
      programaciones: {},
      viajes: {}
    };
    this.serviceStatus = {};
  }

  async init() {
    if (!requireSession()) {
      return;
    }
    modal.init();
    this.bindLayoutEvents();
    await this.validateSession();
    await this.renderCurrent();
  }

  bindLayoutEvents() {
    qsa('.nav-link').forEach((button) => {
      button.addEventListener('click', () => {
        this.setView(button.dataset.view);
        this.sidebar.classList.remove('open');
      });
    });

    qs('#sidebar-toggle').addEventListener('click', () => {
      this.sidebar.classList.toggle('open');
    });

    qs('#logout-button').addEventListener('click', async () => {
      await withLoading(() => AuthService.logout());
      redirectToLogin();
    });

    this.content.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (!action) {
        return;
      }
      this.routeAction(action.dataset.action, action.dataset.id);
    });
  }

  async validateSession() {
    try {
      const data = await withLoading(() => AuthService.validarSesion());
      this.setUser(data.usuario || ApiClient.getUser());
    } catch (error) {
      handleError(error);
    }
  }

  setUser(user) {
    const name = user?.nombre || user?.usuario || 'Usuario';
    const role = user?.rol || 'Rol';
    qs('#user-name').textContent = name;
    qs('#user-role').textContent = role;
    qs('#user-initials').textContent = this.initials(name);
  }

  initials(name) {
    return String(name)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  async setView(view) {
    this.state.view = view;
    this.title.textContent = TITLES[view] || 'Dashboard';
    qsa('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    this.content.innerHTML = '<div class="empty-state">Cargando ' + escapeHtml(TITLES[view] || 'modulo') + '...</div>';
    await this.renderCurrent();
  }

  async renderCurrent() {
    try {
      if (this.state.view === 'conductores') {
        await this.renderConductores();
      } else if (this.state.view === 'vehiculos') {
        await this.renderVehiculos();
      } else if (this.state.view === 'rutas') {
        await this.renderRutas();
      } else if (this.state.view === 'programaciones') {
        await this.renderProgramaciones();
      } else if (this.state.view === 'viajes') {
        await this.renderViajes();
      } else {
        await this.renderDashboard();
      }
      this.content.focus();
    } catch (error) {
      handleError(error);
    }
  }

  async routeAction(action, id) {
    try {
      const map = {
        'reload-view': () => this.renderCurrent(),
        'new-conductor': () => this.openConductorForm(),
        'edit-conductor': () => this.openConductorForm(this.findById(this.state.conductores, id)),
        'delete-conductor': () => this.confirmDelete('Eliminar conductor', 'Se eliminara el conductor seleccionado.', () => this.deleteConductor(id)),
        'new-vehiculo': () => this.openVehiculoForm(),
        'view-vehiculo': () => this.openVehiculoDetail(this.findById(this.state.vehiculos, id)),
        'edit-vehiculo': () => this.openVehiculoForm(this.findById(this.state.vehiculos, id)),
        'delete-vehiculo': () => this.confirmDelete('Eliminar vehiculo', 'Se eliminara el vehiculo seleccionado.', () => this.deleteVehiculo(id)),
        'new-ruta': () => this.openRutaForm(),
        'edit-ruta': () => this.openRutaForm(this.findById(this.state.rutas, id)),
        'delete-ruta': () => this.confirmDelete('Eliminar ruta', 'Se eliminara la ruta seleccionada.', () => this.deleteRuta(id)),
        'new-programacion': () => this.openProgramacionForm(),
        'view-programacion': () => this.openProgramacionDetail(this.findById(this.state.programaciones, id)),
        'edit-programacion': () => this.openProgramacionForm(this.findById(this.state.programaciones, id)),
        'estado-programacion': () => this.openEstadoProgramacion(id),
        'delete-programacion': () => this.confirmDelete('Eliminar programacion', 'Se eliminara la programacion seleccionada.', () => this.deleteProgramacion(id)),
        'viaje-iniciar': () => this.openViajeTextForm('Iniciar viaje', id, 'Inicio del viaje', (novedad) => ViajesService.iniciar(id, novedad)),
        'viaje-novedad': () => this.openViajeTextForm('Registrar novedad', id, 'Novedad operativa', (novedad) => ViajesService.registrarNovedad(id, novedad), true),
        'viaje-estado': () => this.openEstadoViaje(id),
        'viaje-cancelar': () => this.openViajeTextForm('Cancelar viaje', id, 'Motivo de cancelacion', (novedad) => ViajesService.actualizarEstado(id, 'cancelado', novedad)),
        'viaje-finalizar': () => this.openViajeTextForm('Finalizar viaje', id, 'Cierre de viaje', (novedad) => ViajesService.finalizar(id, novedad)),
        'viaje-seguimiento': () => this.openSeguimiento(id)
      };
      if (map[action]) {
        await map[action]();
      }
    } catch (error) {
      handleError(error);
    }
  }

  findById(list, id) {
    return list.find((item) => String(item.id) === String(id));
  }

  async renderDashboard() {
    const data = await this.loadDashboardData();

    Object.assign(this.state, data);
    const recientes = data.programaciones.slice(0, 6);
    const usuario = ApiClient.getUser();
    const totalViajes = this.countUniqueTrips(data.historial);

    this.content.innerHTML =
      '<section class="section-grid">' +
        '<div class="panel">' +
          '<div class="panel-header"><div class="panel-title"><h2>Sesion activa</h2><p>Usuario autenticado desde ms-auth.</p></div></div>' +
          '<div class="detail-list">' +
            '<article><strong>Usuario</strong><span>' + escapeHtml(usuario.nombre || usuario.usuario || 'Usuario') + '</span></article>' +
            '<article><strong>Rol</strong><span>' + escapeHtml(usuario.rol || 'Rol') + '</span></article>' +
          '</div>' +
        '</div>' +
        '<div class="stats-grid">' +
          this.statCard('Conductores', data.conductores.length) +
          this.statCard('Vehiculos', data.vehiculos.length) +
          this.statCard('Rutas', data.rutas.length) +
          this.statCard('Programaciones', data.programaciones.length) +
          this.statCard('Viajes', totalViajes) +
        '</div>' +
        this.serviceStatusPanel(data.statuses) +
        '<div class="panel">' +
          '<div class="panel-header"><div class="panel-title"><h2>Programaciones recientes</h2><p>Ultimos viajes programados en el sistema.</p></div><button class="secondary-button" data-action="new-programacion" type="button">Nueva programacion</button></div>' +
          this.programacionesTable(recientes, false) +
        '</div>' +
      '</section>';
  }

  async loadDashboardData() {
    return withLoading(async () => {
      const [statuses, conductores, vehiculos, rutas, programaciones, historial] = await Promise.all([
        this.checkServices(),
        this.safeRequest('conductores', () => ConductoresService.list()),
        this.safeRequest('vehiculos', () => VehiculosService.list()),
        this.safeRequest('rutas', () => RutasService.list()),
        this.safeRequest('programaciones', () => RutasService.listProgramaciones()),
        this.safeRequest('viajes', () => ViajesService.historial())
      ]);
      return {
        statuses,
        conductores: this.asArray(conductores.data),
        vehiculos: this.asArray(vehiculos.data),
        rutas: this.asArray(rutas.data),
        programaciones: this.asArray(programaciones.data),
        historial: this.asArray(historial.data)
      };
    });
  }

  statCard(label, value) {
    return '<article class="stat-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  async checkServices() {
    const entries = await Promise.all(Object.keys(EXPECTED_SERVICES).map(async (service) => {
      try {
        const data = await ApiClient.health(service);
        const actual = data?.service || 'desconocido';
        return [service, {
          ok: actual === EXPECTED_SERVICES[service],
          expected: EXPECTED_SERVICES[service],
          actual,
          message: actual === EXPECTED_SERVICES[service] ? 'Disponible' : 'Servicio incorrecto en este puerto'
        }];
      } catch (error) {
        return [service, {
          ok: false,
          expected: EXPECTED_SERVICES[service],
          actual: 'sin respuesta',
          message: error.message || 'Servicio no disponible'
        }];
      }
    }));
    this.serviceStatus = Object.fromEntries(entries);
    return this.serviceStatus;
  }

  async safeRequest(key, request) {
    try {
      return { ok: true, data: await request() };
    } catch (error) {
      this.serviceStatus[key] = {
        ...(this.serviceStatus[key] || {}),
        ok: false,
        message: error.message || 'No fue posible consultar el servicio'
      };
      return { ok: false, data: [], error };
    }
  }

  serviceStatusPanel(statuses) {
    const rows = Object.entries(statuses || {}).map(([service, status]) => [
      service,
      status.expected,
      status.actual,
      status.ok ? '<span class="badge success">Disponible</span>' : '<span class="badge danger">' + escapeHtml(status.message) + '</span>'
    ]);
    return '<div class="panel">' +
      '<div class="panel-header"><div class="panel-title"><h2>Estado de microservicios</h2><p>Validacion real de puertos y servicios esperados.</p></div><button class="ghost-button" data-action="reload-view" type="button">Reintentar</button></div>' +
      this.table(['API', 'Esperado', 'Detectado', 'Estado'], rows) +
    '</div>';
  }

  countUniqueTrips(historial) {
    return new Set(this.asArray(historial).map((item) => item.programacion_viaje_id).filter(Boolean)).size;
  }

  async renderConductores() {
    const filters = this.filters.conductores;
    const items = await withLoading(() => ConductoresService.list(filters));
    this.state.conductores = this.asArray(items);
    this.content.innerHTML =
      '<section class="panel">' +
        this.panelHeader('Conductores', 'Administra documentos, licencias y disponibilidad.', 'Nuevo conductor', 'new-conductor') +
        '<form class="toolbar" data-filter="conductores">' +
          this.input('documento', 'Documento', filters.documento) +
          this.input('numero_licencia', 'Licencia', filters.numero_licencia) +
          this.select('estado', ESTADOS_CONDUCTOR, filters.estado) +
          '<button class="secondary-button" type="submit">Filtrar</button><button class="ghost-button" data-clear-filter="conductores" type="button">Limpiar</button>' +
        '</form>' +
        this.conductoresTable(this.state.conductores) +
      '</section>';
    this.bindFilters();
  }

  conductoresTable(items) {
    if (!items.length) {
      return emptyState('No hay conductores para mostrar.');
    }
    const rows = items.map((item) => [
      item.id,
      (item.nombres || '') + ' ' + (item.apellidos || ''),
      item.documento,
      item.telefono,
      item.correo,
      item.numero_licencia,
      badge(item.estado),
      this.actions([
        ['edit-conductor', item.id, 'Editar'],
        ['delete-conductor', item.id, 'Eliminar', 'danger']
      ])
    ]);
    return this.table(['ID', 'Nombre', 'Documento', 'Telefono', 'Correo', 'Licencia', 'Estado', 'Acciones'], rows);
  }

  openConductorForm(item = null) {
    const fields = [
      { name: 'nombres', label: 'Nombres', required: true },
      { name: 'apellidos', label: 'Apellidos', required: true },
      { name: 'documento', label: 'Documento', required: true },
      { name: 'telefono', label: 'Telefono', required: true },
      { name: 'correo', label: 'Correo', type: 'email', required: true },
      { name: 'numero_licencia', label: 'Numero de licencia', required: true },
      { name: 'categoria_licencia', label: 'Categoria licencia', required: true },
      { name: 'fecha_vencimiento_licencia', label: 'Vencimiento licencia', type: 'date', required: true },
      { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_CONDUCTOR.filter((option) => option.value), required: true }
    ];
    const values = item ? { ...item, fecha_vencimiento_licencia: normalizeDate(item.fecha_vencimiento_licencia) } : { estado: 'disponible' };
    this.openEntityForm(item ? 'Editar conductor' : 'Nuevo conductor', fields, values, async (data) => {
      if (item) {
        await ConductoresService.update(item.id, data);
        toast('Conductor actualizado');
      } else {
        await ConductoresService.create(data);
        toast('Conductor creado');
      }
      await this.renderConductores();
    });
  }

  async deleteConductor(id) {
    await withLoading(() => ConductoresService.remove(id));
    toast('Conductor eliminado');
    modal.close();
    await this.renderConductores();
  }

  async renderVehiculos() {
    try {
      const filters = this.filters.vehiculos;
      await this.assertService('vehiculos');
      const items = await withLoading(() => VehiculosService.list(filters));
      this.state.vehiculos = this.asArray(items);
      this.content.innerHTML =
        '<section class="panel">' +
          this.panelHeader('Vehiculos', 'Administra placas, capacidad, tipo y estado.', 'Nuevo vehiculo', 'new-vehiculo') +
          '<form class="toolbar" data-filter="vehiculos">' +
            this.input('placa', 'Placa', filters.placa) +
            this.input('tipo', 'Tipo', filters.tipo) +
            this.select('estado', ESTADOS_VEHICULO, filters.estado) +
            '<button class="secondary-button" type="submit">Filtrar</button><button class="ghost-button" data-clear-filter="vehiculos" type="button">Limpiar</button>' +
          '</form>' +
          this.vehiculosTable(this.state.vehiculos) +
        '</section>';
      this.bindFilters();
    } catch (error) {
      this.renderModuleError('Vehiculos', error);
    }
  }

  vehiculosTable(items) {
    if (!items.length) {
      return emptyState('No hay vehiculos para mostrar.');
    }
    const rows = items.map((item) => [
      item.id,
      item.placa,
      item.tipo_vehiculo,
      item.marca,
      item.modelo,
      item.capacidad_carga,
      badge(item.estado),
      this.actions([
        ['view-vehiculo', item.id, 'Consultar'],
        ['edit-vehiculo', item.id, 'Editar'],
        ['delete-vehiculo', item.id, 'Eliminar', 'danger']
      ])
    ]);
    return this.table(['ID', 'Placa', 'Tipo', 'Marca', 'Modelo', 'Capacidad', 'Estado', 'Acciones'], rows);
  }

  openVehiculoForm(item = null) {
    const fields = [
      { name: 'placa', label: 'Placa', required: true },
      { name: 'tipo_vehiculo', label: 'Tipo de vehiculo', required: true },
      { name: 'capacidad_carga', label: 'Capacidad de carga', type: 'number', required: true },
      { name: 'modelo', label: 'Modelo', required: true },
      { name: 'marca', label: 'Marca', required: true },
      { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_VEHICULO.filter((option) => option.value), required: true }
    ];
    this.openEntityForm(item ? 'Editar vehiculo' : 'Nuevo vehiculo', fields, item || { estado: 'disponible' }, async (data) => {
      this.validateVehiculoPayload(data);
      if (item) {
        await VehiculosService.update(item.id, data);
        toast('Vehiculo actualizado');
      } else {
        await VehiculosService.create(data);
        toast('Vehiculo creado');
      }
      await this.renderVehiculos();
    });
  }

  openVehiculoDetail(item) {
    if (!item) {
      toast('Vehiculo no encontrado', 'error');
      return;
    }
    modal.open({
      title: 'Vehiculo ' + item.placa,
      kicker: 'Consulta',
      content: this.detailList([
        ['ID', item.id],
        ['Placa', item.placa],
        ['Tipo', item.tipo_vehiculo],
        ['Marca', item.marca],
        ['Modelo', item.modelo],
        ['Capacidad', item.capacidad_carga],
        ['Estado', item.estado]
      ])
    });
  }

  validateVehiculoPayload(data) {
    if (!data.placa) {
      throw new ApiError('La placa es obligatoria', 422);
    }
    if (!data.capacidad_carga || Number(data.capacidad_carga) <= 0) {
      throw new ApiError('La capacidad debe ser mayor a cero', 422);
    }
  }

  async deleteVehiculo(id) {
    await withLoading(() => VehiculosService.remove(id));
    toast('Vehiculo eliminado');
    modal.close();
    await this.renderVehiculos();
  }

  async renderRutas() {
    const filters = this.filters.rutas;
    const items = await withLoading(() => RutasService.list(filters));
    this.state.rutas = this.asArray(items);
    this.content.innerHTML =
      '<section class="panel">' +
        this.panelHeader('Rutas', 'Define origen, destino, distancia y tiempo estimado.', 'Nueva ruta', 'new-ruta') +
        '<form class="toolbar three" data-filter="rutas">' +
          this.input('origen', 'Ciudad origen', filters.origen) +
          this.input('destino', 'Ciudad destino', filters.destino) +
          '<button class="secondary-button" type="submit">Filtrar</button><button class="ghost-button" data-clear-filter="rutas" type="button">Limpiar</button>' +
        '</form>' +
        this.rutasTable(this.state.rutas) +
      '</section>';
    this.bindFilters();
  }

  rutasTable(items) {
    if (!items.length) {
      return emptyState('No hay rutas para mostrar.');
    }
    const rows = items.map((item) => [
      item.id,
      item.ciudad_origen,
      item.ciudad_destino,
      item.distancia,
      item.tiempo_estimado,
      item.observaciones || '',
      this.actions([
        ['edit-ruta', item.id, 'Editar'],
        ['delete-ruta', item.id, 'Eliminar', 'danger']
      ])
    ]);
    return this.table(['ID', 'Origen', 'Destino', 'Distancia', 'Tiempo', 'Observaciones', 'Acciones'], rows);
  }

  openRutaForm(item = null) {
    const fields = [
      { name: 'ciudad_origen', label: 'Ciudad origen', required: true },
      { name: 'ciudad_destino', label: 'Ciudad destino', required: true },
      { name: 'distancia', label: 'Distancia', type: 'number', required: true },
      { name: 'tiempo_estimado', label: 'Tiempo estimado', required: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true }
    ];
    this.openEntityForm(item ? 'Editar ruta' : 'Nueva ruta', fields, item || {}, async (data) => {
      if (item) {
        await RutasService.update(item.id, data);
        toast('Ruta actualizada');
      } else {
        await RutasService.create(data);
        toast('Ruta creada');
      }
      await this.renderRutas();
    });
  }

  async deleteRuta(id) {
    await withLoading(() => RutasService.remove(id));
    toast('Ruta eliminada');
    modal.close();
    await this.renderRutas();
  }

  async renderProgramaciones() {
    try {
      await this.assertService('rutas');
      await this.assertService('vehiculos');
      await this.loadReferences();
      const filters = this.filters.programaciones;
      const items = await withLoading(() => RutasService.listProgramaciones(filters));
      this.state.programaciones = this.asArray(items);
      this.content.innerHTML =
        '<section class="panel">' +
          this.panelHeader('Programaciones', 'Agenda viajes validando conductor, vehiculo y ruta.', 'Nueva programacion', 'new-programacion') +
          '<form class="toolbar" data-filter="programaciones">' +
            this.select('conductor_id', this.referenceOptions(this.state.conductores, 'Conductor', (item) => item.nombres + ' ' + item.apellidos), filters.conductor_id) +
            this.select('vehiculo_id', this.referenceOptions(this.state.vehiculos, 'Vehiculo', (item) => item.placa + ' - ' + item.tipo_vehiculo), filters.vehiculo_id) +
            this.input('fecha', 'Fecha salida', filters.fecha, 'date') +
            this.select('estado', ESTADOS_VIAJE, filters.estado) +
            '<button class="secondary-button" type="submit">Filtrar</button><button class="ghost-button" data-clear-filter="programaciones" type="button">Limpiar</button>' +
          '</form>' +
          this.programacionesTable(this.state.programaciones, true) +
        '</section>';
      this.bindFilters();
    } catch (error) {
      this.renderModuleError('Programaciones', error);
    }
  }

  programacionesTable(items, editable) {
    if (!items.length) {
      return emptyState('No hay programaciones para mostrar.');
    }
    const rows = items.map((item) => [
      item.id,
      this.rutaLabel(item),
      this.conductorLabel(item.conductor_id),
      this.vehiculoLabel(item.vehiculo_id),
      normalizeDate(item.fecha_salida),
      item.hora_salida,
      normalizeDate(item.fecha_estimada_llegada),
      badge(item.estado),
      editable ? this.actions([
        ['view-programacion', item.id, 'Consultar'],
        ['edit-programacion', item.id, 'Editar'],
        ['estado-programacion', item.id, 'Estado', 'warning'],
        ['delete-programacion', item.id, 'Eliminar', 'danger']
      ]) : this.actions([
        ['viaje-seguimiento', item.id, 'Seguimiento']
      ])
    ]);
    return this.table(['ID', 'Ruta', 'Conductor', 'Vehiculo', 'Salida', 'Hora', 'Llegada', 'Estado', 'Acciones'], rows);
  }

  async openProgramacionForm(item = null) {
    await this.loadReferences();
    const fields = [
      { name: 'conductor_id', label: 'Conductor', type: 'select', options: this.referenceOptions(this.state.conductores, 'Selecciona conductor', (driver) => driver.nombres + ' ' + driver.apellidos + ' - ' + driver.estado), required: true },
      { name: 'vehiculo_id', label: 'Vehiculo', type: 'select', options: this.referenceOptions(this.state.vehiculos, 'Selecciona vehiculo', (vehicle) => vehicle.placa + ' - ' + vehicle.estado), required: true },
      { name: 'ruta_id', label: 'Ruta', type: 'select', options: this.referenceOptions(this.state.rutas, 'Selecciona ruta', (route) => route.ciudad_origen + ' -> ' + route.ciudad_destino), required: true },
      { name: 'fecha_salida', label: 'Fecha salida', type: 'date', required: true },
      { name: 'hora_salida', label: 'Hora salida', type: 'time', required: true },
      { name: 'fecha_estimada_llegada', label: 'Fecha estimada llegada', type: 'date', required: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true }
    ];
    const values = item ? {
      ...item,
      fecha_salida: normalizeDate(item.fecha_salida),
      fecha_estimada_llegada: normalizeDate(item.fecha_estimada_llegada)
    } : {};
    this.openEntityForm(item ? 'Editar programacion' : 'Nueva programacion', fields, values, async (data) => {
      this.validateProgramacionPayload(data);
      if (item) {
        await RutasService.updateProgramacion(item.id, data);
        toast('Programacion actualizada');
      } else {
        await RutasService.createProgramacion(data);
        toast('Programacion creada');
      }
      await this.renderProgramaciones();
    });
  }

  openProgramacionDetail(item) {
    if (!item) {
      toast('Programacion no encontrada', 'error');
      return;
    }
    modal.open({
      title: 'Programacion #' + item.id,
      kicker: 'Consulta',
      content: this.detailList([
        ['Ruta', this.rutaLabel(item)],
        ['Conductor', this.conductorLabel(item.conductor_id)],
        ['Vehiculo', this.vehiculoLabel(item.vehiculo_id)],
        ['Fecha salida', normalizeDate(item.fecha_salida)],
        ['Hora salida', item.hora_salida],
        ['Fecha estimada llegada', normalizeDate(item.fecha_estimada_llegada)],
        ['Estado', item.estado],
        ['Observaciones', item.observaciones || '']
      ])
    });
  }

  validateProgramacionPayload(data) {
    const conductor = this.findById(this.state.conductores, data.conductor_id);
    const vehiculo = this.findById(this.state.vehiculos, data.vehiculo_id);
    const ruta = this.findById(this.state.rutas, data.ruta_id);
    if (!conductor) {
      throw new ApiError('Debe seleccionar un conductor existente', 422);
    }
    if (conductor.estado === 'inactivo') {
      throw new ApiError('No se puede asignar un conductor inactivo', 422);
    }
    if (conductor.estado !== 'disponible') {
      throw new ApiError('El conductor seleccionado no esta disponible', 422);
    }
    if (!vehiculo) {
      throw new ApiError('Debe seleccionar un vehiculo existente', 422);
    }
    if (vehiculo.estado === 'mantenimiento') {
      throw new ApiError('No se puede asignar un vehiculo en mantenimiento', 422);
    }
    if (vehiculo.estado !== 'disponible') {
      throw new ApiError('El vehiculo seleccionado no esta disponible', 422);
    }
    if (!ruta) {
      throw new ApiError('Debe seleccionar una ruta existente', 422);
    }
  }

  openEstadoProgramacion(id) {
    const item = this.findById(this.state.programaciones, id);
    const fields = [
      { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_VIAJE.filter((option) => option.value), required: true }
    ];
    this.openEntityForm('Actualizar estado', fields, { estado: item?.estado || 'programado' }, async (data) => {
      await RutasService.updateProgramacionEstado(id, data.estado);
      toast('Estado actualizado');
      await this.renderProgramaciones();
    });
  }

  async deleteProgramacion(id) {
    await withLoading(() => RutasService.removeProgramacion(id));
    toast('Programacion eliminada');
    modal.close();
    await this.renderProgramaciones();
  }

  async renderViajes() {
    try {
      await this.assertService('rutas');
      await this.assertService('viajes');
      await this.loadReferencesSafe();
      const filters = this.filters.viajes;
      const [programaciones, historial] = await withLoading(() => Promise.all([
        RutasService.listProgramaciones(filters),
        ViajesService.historial()
      ]));
      this.state.programaciones = this.asArray(programaciones);
      this.state.historial = this.asArray(historial);
      this.content.innerHTML =
        '<section class="section-grid">' +
          '<div class="panel">' +
            '<div class="panel-header"><div class="panel-title"><h2>Viajes</h2><p>Inicia, actualiza, finaliza y consulta seguimiento.</p></div><button class="ghost-button" data-action="reload-view" type="button">Reintentar</button></div>' +
            '<form class="toolbar" data-filter="viajes">' +
              this.select('conductor_id', this.referenceOptions(this.state.conductores, 'Conductor', (item) => item.nombres + ' ' + item.apellidos), filters.conductor_id) +
              this.select('vehiculo_id', this.referenceOptions(this.state.vehiculos, 'Vehiculo', (item) => item.placa), filters.vehiculo_id) +
              this.input('fecha', 'Fecha salida', filters.fecha, 'date') +
              this.select('estado', ESTADOS_VIAJE, filters.estado) +
              '<button class="secondary-button" type="submit">Filtrar</button><button class="ghost-button" data-clear-filter="viajes" type="button">Limpiar</button>' +
            '</form>' +
            this.viajesTable(this.state.programaciones) +
          '</div>' +
          '<div class="panel">' +
            '<div class="panel-header"><div class="panel-title"><h2>Historial reciente</h2><p>Ultimas novedades registradas desde ms-viajes.</p></div></div>' +
            this.historialTable(this.state.historial.slice(0, 10)) +
          '</div>' +
        '</section>';
      this.bindFilters();
    } catch (error) {
      this.renderModuleError('Viajes y seguimiento', error);
    }
  }

  viajesTable(items) {
    if (!items.length) {
      return emptyState('No hay viajes para mostrar.');
    }
    const rows = items.map((item) => [
      item.id,
      this.rutaLabel(item),
      this.conductorLabel(item.conductor_id),
      this.vehiculoLabel(item.vehiculo_id),
      normalizeDate(item.fecha_salida),
      badge(item.estado),
      this.viajeActions(item)
    ]);
    return this.table(['Programacion', 'Ruta', 'Conductor', 'Vehiculo', 'Salida', 'Estado', 'Acciones'], rows);
  }

  viajeActions(item) {
    const estado = item.estado;
    const actions = [['viaje-seguimiento', item.id, 'Seguimiento']];
    if (estado === 'programado') {
      actions.unshift(['viaje-iniciar', item.id, 'Iniciar']);
      actions.push(['viaje-cancelar', item.id, 'Cancelar', 'danger']);
    }
    if (estado === 'en_transito' || estado === 'retrasado') {
      actions.unshift(['viaje-novedad', item.id, 'Novedad']);
      actions.unshift(['viaje-estado', item.id, 'Estado', 'warning']);
      actions.push(['viaje-finalizar', item.id, 'Finalizar']);
    }
    return this.actions(actions);
  }

  historialTable(items) {
    if (!items.length) {
      return emptyState('No hay historial para mostrar.');
    }
    const rows = items.map((item) => [
      item.programacion_viaje_id,
      normalizeDate(item.fecha),
      item.hora,
      badge(item.estado),
      item.novedad || ''
    ]);
    return this.table(['Viaje', 'Fecha', 'Hora', 'Estado', 'Novedad'], rows);
  }

  openViajeTextForm(title, id, label, action, required = false) {
    const fields = [{ name: 'novedad', label, type: 'textarea', full: true, required }];
    this.openEntityForm(title, fields, {}, async (data) => {
      await action(data.novedad || '');
      toast(title + ' completado');
      await this.renderViajes();
    }, 'Confirmar');
  }

  openEstadoViaje(id) {
    const fields = [
      { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_VIAJE.filter((option) => ['en_transito', 'retrasado', 'cancelado'].includes(option.value)), required: true },
      { name: 'novedad', label: 'Novedad', type: 'textarea', full: true }
    ];
    this.openEntityForm('Actualizar estado de viaje', fields, { estado: 'retrasado' }, async (data) => {
      await ViajesService.actualizarEstado(id, data.estado, data.novedad || '');
      toast('Estado del viaje actualizado');
      await this.renderViajes();
    });
  }

  async openSeguimiento(id) {
    const data = await withLoading(() => ViajesService.seguimiento(id));
    const registros = this.asArray(data.seguimiento);
    const content = registros.length ? this.historialTable(registros) : emptyState('Este viaje no tiene registros de seguimiento.');
    modal.open({
      title: 'Seguimiento del viaje #' + id,
      kicker: 'Seguimiento',
      content
    });
  }

  async loadReferences() {
    const [conductores, vehiculos, rutas] = await withLoading(() => Promise.all([
      ConductoresService.list(),
      VehiculosService.list(),
      RutasService.list()
    ]));
    this.state.conductores = this.asArray(conductores);
    this.state.vehiculos = this.asArray(vehiculos);
    this.state.rutas = this.asArray(rutas);
  }

  async loadReferencesSafe() {
    const [conductores, vehiculos, rutas] = await withLoading(() => Promise.all([
      this.safeRequest('conductores', () => ConductoresService.list()),
      this.safeRequest('vehiculos', () => VehiculosService.list()),
      this.safeRequest('rutas', () => RutasService.list())
    ]));
    this.state.conductores = this.asArray(conductores.data);
    this.state.vehiculos = this.asArray(vehiculos.data);
    this.state.rutas = this.asArray(rutas.data);
  }

  async assertService(service) {
    try {
      const data = await ApiClient.health(service);
      const actual = data?.service || 'desconocido';
      if (actual !== EXPECTED_SERVICES[service]) {
        throw new ApiError('El puerto configurado para ' + EXPECTED_SERVICES[service] + ' esta respondiendo como ' + actual, 503);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('No hay conexion con ' + EXPECTED_SERVICES[service], 0);
    }
  }

  renderModuleError(title, error) {
    this.content.innerHTML =
      '<section class="panel">' +
        '<div class="panel-header"><div class="panel-title"><h2>' + escapeHtml(title) + '</h2><p>No fue posible cargar este modulo con datos reales.</p></div><button class="ghost-button" data-action="reload-view" type="button">Reintentar</button></div>' +
        '<div class="empty-state">' + escapeHtml(error.message || 'Error de conexion con el backend') + '</div>' +
      '</section>';
  }

  detailList(items) {
    const rows = items.map(([label, value]) => {
      const content = String(value ?? '').startsWith('<span') ? value : escapeHtml(value ?? '');
      return '<article><strong>' + escapeHtml(label) + '</strong><span>' + content + '</span></article>';
    }).join('');
    return '<div class="detail-list">' + rows + '</div>';
  }

  bindFilters() {
    qsa('[data-filter]', this.content).forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const key = form.dataset.filter;
        this.filters[key] = this.cleanObject(serializeForm(form));
        await this.renderCurrent();
      });
    });

    qsa('[data-clear-filter]', this.content).forEach((button) => {
      button.addEventListener('click', async () => {
        this.filters[button.dataset.clearFilter] = {};
        await this.renderCurrent();
      });
    });
  }

  openEntityForm(title, fields, values, onSubmit, submitText = 'Guardar') {
    modal.open({
      title,
      content: buildForm(fields, values, submitText)
    });
    qs('.modal-form', modal.body).addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = this.cleanObject(serializeForm(event.currentTarget), true);
      try {
        await withLoading(() => onSubmit(data));
        modal.close();
      } catch (error) {
        handleError(error);
      }
    });
  }

  confirmDelete(title, message, onConfirm) {
    modal.open({
      title,
      kicker: 'Confirmacion',
      content: '<p class="muted">' + escapeHtml(message) + '</p><div class="modal-actions"><button class="ghost-button" type="button" data-modal-close>Cancelar</button><button class="danger-button" id="confirm-delete-button" type="button">Eliminar</button></div>'
    });
    qs('#confirm-delete-button', modal.body).addEventListener('click', async () => {
      try {
        await onConfirm();
      } catch (error) {
        handleError(error);
      }
    });
  }

  panelHeader(title, subtitle, buttonText, action) {
    return '<div class="panel-header"><div class="panel-title"><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(subtitle) + '</p></div><button class="primary-button" data-action="' + action + '" type="button">' + escapeHtml(buttonText) + '</button></div>';
  }

  input(name, placeholder, value = '', type = 'text') {
    return '<input name="' + name + '" type="' + type + '" value="' + escapeHtml(value || '') + '" placeholder="' + escapeHtml(placeholder) + '">';
  }

  select(name, options, value = '') {
    const opts = options.map((option) => {
      const selected = String(option.value) === String(value || '') ? ' selected' : '';
      return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
    }).join('');
    return '<select name="' + name + '">' + opts + '</select>';
  }

  table(headers, rows) {
    const head = headers.map((header) => '<th>' + escapeHtml(header) + '</th>').join('');
    const body = rows.map((row) => '<tr>' + row.map((cell) => '<td>' + this.cell(cell) + '</td>').join('') + '</tr>').join('');
    return '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  cell(value) {
    const text = String(value ?? '');
    if (text.startsWith('<span') || text.startsWith('<div')) {
      return text;
    }
    return escapeHtml(text);
  }

  actions(items) {
    const buttons = items.map(([action, id, label, type]) => {
      return '<button class="table-action ' + escapeHtml(type || '') + '" data-action="' + action + '" data-id="' + escapeHtml(id) + '" type="button">' + escapeHtml(label) + '</button>';
    }).join('');
    return '<div class="actions">' + buttons + '</div>';
  }

  referenceOptions(items, placeholder, labelBuilder) {
    const options = [{ value: '', label: placeholder }];
    this.asArray(items).forEach((item) => {
      options.push({ value: item.id, label: '#' + item.id + ' - ' + labelBuilder(item) });
    });
    return options;
  }

  rutaLabel(programacion) {
    const ruta = programacion.ruta || this.findById(this.state.rutas, programacion.ruta_id);
    if (!ruta) {
      return 'Ruta #' + programacion.ruta_id;
    }
    return ruta.ciudad_origen + ' -> ' + ruta.ciudad_destino;
  }

  conductorLabel(id) {
    const conductor = this.findById(this.state.conductores, id);
    if (!conductor) {
      return 'Conductor #' + id;
    }
    return conductor.nombres + ' ' + conductor.apellidos + ' (' + conductor.estado + ')';
  }

  vehiculoLabel(id) {
    const vehiculo = this.findById(this.state.vehiculos, id);
    if (!vehiculo) {
      return 'Vehiculo #' + id;
    }
    return vehiculo.placa + ' - ' + vehiculo.tipo_vehiculo + ' (' + vehiculo.estado + ')';
  }

  cleanObject(data, keepEmpty = false) {
    const result = {};
    Object.entries(data).forEach(([key, value]) => {
      if (keepEmpty || String(value ?? '').trim() !== '') {
        result[key] = value;
      }
    });
    return result;
  }

  asArray(value) {
    return Array.isArray(value) ? value : [];
  }
}

const app = new LogiTransApp();
app.init();
