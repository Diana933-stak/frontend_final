import { ApiClient } from './ApiClient.js';

export class ConductoresService {
  static list(filters = {}) {
    return ApiClient.request('conductores', '/api/conductores', { params: filters });
  }

  static get(id) {
    return ApiClient.request('conductores', '/api/conductores/' + id);
  }

  static byDocumento(documento) {
    return ApiClient.request('conductores', '/api/conductores/documento/' + encodeURIComponent(documento));
  }

  static byLicencia(licencia) {
    return ApiClient.request('conductores', '/api/conductores/licencia/' + encodeURIComponent(licencia));
  }

  static byEstado(estado) {
    return ApiClient.request('conductores', '/api/conductores/estado/' + encodeURIComponent(estado));
  }

  static create(data) {
    return ApiClient.request('conductores', '/api/conductores', { method: 'POST', body: data });
  }

  static update(id, data) {
    return ApiClient.request('conductores', '/api/conductores/' + id, { method: 'PUT', body: data });
  }

  static patch(id, data) {
    return ApiClient.request('conductores', '/api/conductores/' + id, { method: 'PATCH', body: data });
  }

  static remove(id) {
    return ApiClient.request('conductores', '/api/conductores/' + id, { method: 'DELETE' });
  }
}
