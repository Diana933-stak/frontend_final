import { ApiClient } from './ApiClient.js';

export class VehiculosService {
  static list(filters = {}) {
    return ApiClient.request('vehiculos', '/api/vehiculos', { params: filters });
  }

  static get(id) {
    return ApiClient.request('vehiculos', '/api/vehiculos/' + id);
  }

  static byPlaca(placa) {
    return ApiClient.request('vehiculos', '/api/vehiculos/placa/' + encodeURIComponent(placa));
  }

  static byEstado(estado) {
    return ApiClient.request('vehiculos', '/api/vehiculos/estado/' + encodeURIComponent(estado));
  }

  static byTipo(tipo) {
    return ApiClient.request('vehiculos', '/api/vehiculos/tipo/' + encodeURIComponent(tipo));
  }

  static create(data) {
    return ApiClient.request('vehiculos', '/api/vehiculos', { method: 'POST', body: data });
  }

  static update(id, data) {
    return ApiClient.request('vehiculos', '/api/vehiculos/' + id, { method: 'PUT', body: data });
  }

  static patch(id, data) {
    return ApiClient.request('vehiculos', '/api/vehiculos/' + id, { method: 'PATCH', body: data });
  }

  static remove(id) {
    return ApiClient.request('vehiculos', '/api/vehiculos/' + id, { method: 'DELETE' });
  }
}
