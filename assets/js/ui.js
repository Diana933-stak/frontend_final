import { ApiClient } from '../../services/ApiClient.js';

let loadingCount = 0;

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeDate(value) {
  if (!value) {
    return '';
  }
  return String(value).slice(0, 10);
}

export function showLoading() {
  loadingCount += 1;
  const overlay = qs('#loading-overlay');
  overlay?.classList.remove('hidden');
  overlay?.setAttribute('aria-hidden', 'false');
}

export function hideLoading() {
  loadingCount = Math.max(loadingCount - 1, 0);
  if (loadingCount === 0) {
    const overlay = qs('#loading-overlay');
    overlay?.classList.add('hidden');
    overlay?.setAttribute('aria-hidden', 'true');
  }
}

export async function withLoading(task) {
  showLoading();
  try {
    return await task();
  } finally {
    hideLoading();
  }
}

export function toast(message, type = 'success') {
  const container = qs('#toast-container');
  if (!container) {
    return;
  }
  const item = document.createElement('div');
  item.className = 'toast ' + type;
  item.textContent = message;
  container.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

export function badgeClass(estado) {
  const value = String(estado || '').toLowerCase();
  if (['activo', 'disponible', 'programado', 'finalizado'].includes(value)) {
    return 'success';
  }
  if (['en_ruta', 'en_transito', 'retrasado', 'mantenimiento'].includes(value)) {
    return 'warning';
  }
  if (['inactivo', 'cancelado'].includes(value)) {
    return 'danger';
  }
  return 'neutral';
}

export function badge(estado) {
  return '<span class="badge ' + badgeClass(estado) + '">' + escapeHtml(labelEstado(estado)) + '</span>';
}

export function labelEstado(value) {
  return String(value ?? 'sin_estado').replaceAll('_', ' ');
}

export function serializeForm(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = typeof value === 'string' ? value.trim() : value;
  });
  return data;
}

export function requireSession() {
  if (!ApiClient.getToken()) {
    window.location.replace('./login.html');
    return false;
  }
  return true;
}

export function redirectToLogin() {
  ApiClient.clearSession();
  window.location.replace('./login.html');
}

export function handleError(error) {
  if (error?.status === 401) {
    toast('Sesion expirada. Ingresa nuevamente.', 'warning');
    setTimeout(redirectToLogin, 700);
    return;
  }
  const details = error?.errors ? formatErrors(error.errors) : '';
  toast((error?.message || 'No fue posible completar la operacion') + details, 'error');
}

export function formatErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return '';
  }
  const values = Object.entries(errors).map(([key, value]) => key + ': ' + value);
  return values.length ? ' | ' + values.join(' | ') : '';
}

export const modal = {
  root: null,
  body: null,
  title: null,
  kicker: null,
  init() {
    this.root = qs('#modal-root');
    this.body = qs('#modal-body');
    this.title = qs('#modal-title');
    this.kicker = qs('#modal-kicker');
    this.root?.addEventListener('click', (event) => {
      if (event.target.matches('[data-modal-close]')) {
        this.close();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.root?.classList.contains('hidden')) {
        this.close();
      }
    });
  },
  open({ title, kicker = 'Formulario', content }) {
    this.title.textContent = title;
    this.kicker.textContent = kicker;
    this.body.innerHTML = content;
    this.root.classList.remove('hidden');
    this.root.setAttribute('aria-hidden', 'false');
    const focusable = this.body.querySelector('input, select, textarea, button');
    focusable?.focus();
  },
  close() {
    this.root?.classList.add('hidden');
    this.root?.setAttribute('aria-hidden', 'true');
    if (this.body) {
      this.body.innerHTML = '';
    }
  }
};

export function fieldMarkup(field, value = '') {
  const required = field.required ? ' required' : '';
  const full = field.full ? ' class="full"' : '';
  const safeValue = escapeHtml(value ?? '');
  if (field.type === 'select') {
    const options = (field.options || []).map((option) => {
      const selected = String(option.value) === String(value ?? '') ? ' selected' : '';
      return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
    }).join('');
    return '<label' + full + '><span>' + escapeHtml(field.label) + '</span><select name="' + field.name + '"' + required + '>' + options + '</select></label>';
  }
  if (field.type === 'textarea') {
    return '<label' + full + '><span>' + escapeHtml(field.label) + '</span><textarea name="' + field.name + '"' + required + '>' + safeValue + '</textarea></label>';
  }
  return '<label' + full + '><span>' + escapeHtml(field.label) + '</span><input name="' + field.name + '" type="' + (field.type || 'text') + '" value="' + safeValue + '"' + required + '></label>';
}

export function buildForm(fields, values = {}, submitText = 'Guardar') {
  const controls = fields.map((field) => fieldMarkup(field, values[field.name])).join('');
  return '<form class="stack-form modal-form" novalidate><div class="form-grid">' + controls + '</div><div class="modal-actions"><button class="ghost-button" type="button" data-modal-close>Cancelar</button><button class="primary-button" type="submit">' + submitText + '</button></div></form>';
}

export function emptyState(message) {
  return '<div class="empty-state">' + escapeHtml(message) + '</div>';
}
