/* Shared helpers: API calls, login state, header and footer */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const fmtDate = (s) => new Date(s + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const Auth = {
  get token() { try { return localStorage.getItem('vcr_token'); } catch (_) { return null; } },
  get user() { try { return JSON.parse(localStorage.getItem('vcr_user') || 'null'); } catch (_) { return null; } },
  set(token, user) { try { localStorage.setItem('vcr_token', token); localStorage.setItem('vcr_user', JSON.stringify(user)); } catch (_) {} },
  clear() { try { localStorage.removeItem('vcr_token'); localStorage.removeItem('vcr_user'); } catch (_) {} },
};

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (Auth.token) h.Authorization = 'Bearer ' + Auth.token;
  let res;
  try {
    res = await fetch(path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (_) {
    throw new Error('Cannot reach the server. Please check your internet connection.');
  }
  let data = {};
  try { data = await res.json(); } catch (_) { /* ignore */ }
  if (!res.ok) {
    if (res.status === 401 && Auth.token && !/login|signup/.test(path)) Auth.clear();
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

function renderChrome(active) {
  const u = Auth.user;
  const links = u
    ? `<span class="hello">Hi, ${esc(u.name.split(' ')[0])}</span>
       <a href="/bookings.html">My bookings</a>
       <button class="link" id="logout">Logout</button>`
    : `<a href="/login.html">Login</a><a class="cta" href="/signup.html">Sign up</a>`;
  const header = document.getElementById('site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `<div class="wrap">
      <a class="brand" href="/"><span class="brand-mark">V</span>
        <span class="brand-text"><b>Vinayaka</b><small>Car Rentals</small></span></a>
      <nav class="nav"><a href="/#car">Our car</a><a href="/#book">Book &amp; fares</a>${links}</nav></div>`;
    const lo = document.getElementById('logout');
    if (lo) lo.onclick = async () => {
      try { await api('/api/logout', { method: 'POST', body: {} }); } catch (_) {}
      Auth.clear();
      location.href = '/';
    };
  }
  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML = `<div class="wrap">
      <div><div class="tag">Your Journey, Our Priority</div>
        <div style="opacity:.8;font-size:14px">Vinayaka Car Rentals · Safe · Comfortable · Always with you</div></div>
      <div>Call / WhatsApp: <a href="tel:+917995301676">79953 01676</a></div></div>`;
  }
  // validate the saved login quietly
  if (Auth.token) api('/api/me').then((r) => { Auth.set(Auth.token, r.user); }).catch((e) => { if (e.status === 401) { Auth.clear(); if (u) renderChrome(active); } });
}

function safeNext(raw) {
  // only allow same-site relative paths
  return raw && /^\/[^/\\]/.test(raw) || raw === '/' ? raw : '/';
}
document.addEventListener('DOMContentLoaded', () => renderChrome());
