import { ApiClient } from './ApiClient.js';

export class AuthService {
  static async login(identificador, contrasena) {
    const data = await ApiClient.request('auth', '/api/login', {
      method: 'POST',
      auth: false,
      body: { identificador, contrasena }
    });
    ApiClient.setSession(data.token, data.usuario);
    return data;
  }

  static async logout() {
    try {
      await ApiClient.request('auth', '/api/logout', { method: 'POST' });
    } finally {
      ApiClient.clearSession();
    }
  }

  static async validarSesion() {
    const data = await ApiClient.request('auth', '/api/validar-sesion');
    if (data?.usuario) {
      ApiClient.setSession(ApiClient.getToken(), data.usuario);
    }
    return data;
  }
}
