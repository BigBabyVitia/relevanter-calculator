/* ==============================
   Relevanter — Admin Panel
   ============================== */

const STORAGE_PREFIX = 'relevanter_';
const SESSION_KEY = STORAGE_PREFIX + 'admin_session';

// Default settings
const DEFAULTS = {
  tg_link: '',
  cta_text: 'Оставить заявку',
  copyright: '© 2025 WMT AI · Relevanter',
};

// ---- DOM ----
const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginBtn    = document.getElementById('login-btn');
const loginMsg    = document.getElementById('login-msg');
const passwordInput = document.getElementById('admin-password');
const saveBtn     = document.getElementById('save-btn');
const saveMsg     = document.getElementById('save-msg');
const logoutBtn   = document.getElementById('logout-btn');

const fields = {
  tg_link:   document.getElementById('setting-tg-link'),
  cta_text:  document.getElementById('setting-cta-text'),
  copyright: document.getElementById('setting-copyright'),
};

// ---- Auth ----
// Password is checked via Vercel serverless function (api/auth.js)
// For local dev, falls back to localStorage password

async function checkPassword(password) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.ok === true;
    }
    // If API not available (local dev), use localStorage fallback
    return false;
  } catch {
    // API not available — local dev fallback
    const localPassword = localStorage.getItem(STORAGE_PREFIX + 'admin_password');
    if (!localPassword) {
      // First time — set this password
      localStorage.setItem(STORAGE_PREFIX + 'admin_password', password);
      return true;
    }
    return localPassword === password;
  }
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function showScreen(screen) {
  loginScreen.classList.remove('active');
  adminScreen.classList.remove('active');
  screen.classList.add('active');
}

// ---- Settings storage ----
function getSetting(key) {
  return localStorage.getItem(STORAGE_PREFIX + key) || DEFAULTS[key] || '';
}

function setSetting(key, value) {
  localStorage.setItem(STORAGE_PREFIX + key, value);
}

function loadSettings() {
  Object.keys(fields).forEach(key => {
    fields[key].value = getSetting(key);
    fields[key].placeholder = DEFAULTS[key] || '';
  });
}

function saveSettings() {
  Object.keys(fields).forEach(key => {
    setSetting(key, fields[key].value.trim());
  });
}

// ---- Event handlers ----
loginBtn.addEventListener('click', async () => {
  const password = passwordInput.value.trim();
  if (!password) {
    showMsg(loginMsg, 'Введите пароль', 'err');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Проверка...';

  const ok = await checkPassword(password);

  loginBtn.disabled = false;
  loginBtn.textContent = 'Войти';

  if (ok) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    showScreen(adminScreen);
    loadSettings();
  } else {
    showMsg(loginMsg, 'Неверный пароль', 'err');
  }
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

saveBtn.addEventListener('click', () => {
  saveSettings();
  showMsg(saveMsg, 'Настройки сохранены!', 'ok');
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showScreen(loginScreen);
  passwordInput.value = '';
});

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'msg msg--' + type;
  setTimeout(() => { el.className = 'msg'; }, 3000);
}

// ---- Init ----
if (isLoggedIn()) {
  showScreen(adminScreen);
  loadSettings();
}
