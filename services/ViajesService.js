import { ApiClient } from './ApiClient.js';

export class ViajesService {
  static iniciar(programacionId, novedad = '') {
    return ApiClient.request('viajes', '/api/viajes/' + programacionId + '/iniciar', {
      method: 'POST',
      body: { novedad }
    });
  }

  static actualizarEstado(programacionId, estado, novedad = '') {
    return ApiClient.request('viajes', '/api/viajes/' + programacionId + '/estado', {
      method: 'PATCH',
      body: { estado, novedad }
    });
  }

  static registrarNovedad(programacionId, novedad) {
    return ApiClient.request('viajes', '/api/viajes/' + programacionId + '/novedades', {
      method: 'POST',
      body: { novedad }
    });
  }

  static finalizar(programacionId, novedad = '') {
    return ApiClient.request('viajes', '/api/viajes/' + programacionId + '/finalizar', {
      method: 'POST',
      body: { novedad }
    });
  }

  static seguimiento(programacionId) {
    return ApiClient.request('viajes', '/api/viajes/' + programacionId + '/seguimiento');
  }

  static historial(filters = {}) {
    return ApiClient.request('viajes', '/api/viajes/historial', { params: filters });
  }
}
