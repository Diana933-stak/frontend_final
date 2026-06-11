export const API_SERVICES = {
  auth: 'http://127.0.0.1:8001',
  conductores: 'http://127.0.0.1:8002',
  vehiculos: 'http://127.0.0.1:8003',
  rutas: 'http://127.0.0.1:8004',
  viajes: 'http://127.0.0.1:8005'
};

export const STORAGE_KEYS = {
  token: 'logitrans_token',
  user: 'logitrans_user'
};

export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export class ApiClient {
  static getToken() {
    return localStorage.getItem(STORAGE_KEYS.token);
  }

  static setSession(token, user) {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user || {}));
  }

  static clearSession() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  static getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || '{}');
    } catch {
      return {};
    }
  }

  static buildUrl(service, path, params = {}) {
    const base = API_SERVICES[service];
    if (!base) {
      throw new ApiError('Servicio no configurado: ' + service);
    }
    const url = new URL(path, base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        url.searchParams.set(key, String(value).trim());
      }
    });
    return url.toString();
  }

  static async request(service, path, options = {}) {
    const {
      method = 'GET',
      body = null,
      params = {},
      auth = true
    } = options;

    const headers = { Accept: 'application/json' };

    if (body !== null) {
      headers['Content-Type'] = 'application/json';
    }

    const token = ApiClient.getToken();
    if (auth && token) {
      headers.Authorization = 'Bearer ' + token;
    }

    try {
      const response = await fetch(ApiClient.buildUrl(service, path, params), {
        method,
        headers,
        body: body === null ? null : JSON.stringify(body)
      });

      const payload = await ApiClient.parseJson(response);
      if (!response.ok || payload.success === false) {
        throw new ApiError(
          payload.message || 'No fue posible completar la solicitud',
          response.status,
          payload.errors || null
        );
      }
      return payload.data ?? null;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('No hay conexion con el servicio solicitado', 0);
    }
  }

  static async health(service) {
    const response = await fetch(ApiClient.buildUrl(service, '/', {}), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    const payload = await ApiClient.parseJson(response);
    if (!response.ok || payload.success === false) {
      throw new ApiError(payload.message || 'Servicio no disponible', response.status);
    }
    return payload.data ?? null;
  }

  static async parseJson(response) {
    const text = await response.text();
    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError('La respuesta del servidor no es JSON valido', response.status);
    }
  }
}
