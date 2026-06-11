import { ApiClient } from '../../services/ApiClient.js';

const token = ApiClient.getToken();
window.location.replace(token ? './dashboard.html' : './login.html');
