import { ApiClient } from './ApiClient.js';

export class RutasService {
  static list(filters = {}) {
    return ApiClient.request('rutas', '/api/rutas', { params: filters });
  }

  static get(id) {
    return ApiClient.request('rutas', '/api/rutas/' + id);
  }

  static create(data) {
    return ApiClient.request('rutas', '/api/rutas', { method: 'POST', body: data });
  }

  static update(id, data) {
    return ApiClient.request('rutas', '/api/rutas/' + id, { method: 'PUT', body: data });
  }

  static remove(id) {
    return ApiClient.request('rutas', '/api/rutas/' + id, { method: 'DELETE' });
  }

  static listProgramaciones(filters = {}) {
    return ApiClient.request('rutas', '/api/programaciones-viajes', { params: filters });
  }

  static getProgramacion(id) {
    return ApiClient.request('rutas', '/api/programaciones-viajes/' + id);
  }

  static createProgramacion(data) {
    return ApiClient.request('rutas', '/api/programaciones-viajes', { method: 'POST', body: data });
  }

  static updateProgramacion(id, data) {
    return ApiClient.request('rutas', '/api/programaciones-viajes/' + id, { method: 'PUT', body: data });
  }

  static updateProgramacionEstado(id, estado) {
    return ApiClient.request('rutas', '/api/programaciones-viajes/' + id + '/estado', {
      method: 'PATCH',
      body: { estado }
    });
  }

  static removeProgramacion(id) {
    return ApiClient.request('rutas', '/api/programaciones-viajes/' + id, { method: 'DELETE' });
  }
}
