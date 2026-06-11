import { AuthService } from '../../services/AuthService.js';
import { ApiClient } from '../../services/ApiClient.js';
import { qs, toast, withLoading } from './ui.js';

if (ApiClient.getToken()) {
  window.location.replace('./dashboard.html');
}

const form = qs('#login-form');
const message = qs('#login-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  const identificador = qs('#login-identifier').value.trim();
  const contrasena = qs('#login-password').value;

  if (!identificador || !contrasena) {
    message.textContent = 'Completa usuario/correo y contrasena.';
    return;
  }

  try {
    await withLoading(() => AuthService.login(identificador, contrasena));
    toast('Bienvenido a LogiTrans');
    window.location.replace('./dashboard.html');
  } catch (error) {
    message.textContent = error.message || 'No fue posible iniciar sesion.';
    toast(message.textContent, 'error');
  }
});
