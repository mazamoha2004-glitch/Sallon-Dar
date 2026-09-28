// ---------------- State ----------------
let currentUser = null;   // supabase auth user
let currentProfile = null; // row from public.profiles
let servicesCache = [];
let selectedServiceIds = new Set();

const appEl = document.getElementById('app');
const authSlotEl = document.getElementById('authSlot');

// ---------------- Helpers ----------------
function formatTZS(amount) {
  return 'TSh ' + Number(amount).toLocaleString('en-US');
}

function isValidTanzanianPhone(phone) {
  return /^(\+?255|0)\d{9}$/.test(phone.replace(/\s+/g, ''));
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ---------------- Auth state ----------------
async function refreshAuthState() {
  const { data: { user } } = await sb.auth.getUser();
  currentUser = user;
  if (user) {
    const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
    currentProfile = profile || null;
  } else {
    currentProfile = null;
  }
  renderAuthSlot();
  renderNav();
}

function renderAuthSlot() {
  if (currentUser && currentProfile) {
    authSlotEl.innerHTML = `
      <span class="who">${escapeHtml(currentProfile.name)}</span>
      <button class="secondary" id="logoutBtn">Log out</button>
    `;
    document.getElementById('logoutBtn').onclick = async () => {
      await sb.auth.signOut();
      await refreshAuthState();
      toast('Logged out.');
      location.hash = '#/';
    };
  } else {
    authSlotEl.innerHTML = `<a href="#/login">Log in</a> &nbsp;/&nbsp; <a href="#/register">Register</a>`;
  }
}

function renderNav() {
  document.querySelectorAll('[data-requires-auth]').forEach(el => {
    el.style.display = currentUser ? '' : 'none';
  });
  document.querySelectorAll('[data-admin-only]').forEach(el => {
    el.style.display = (currentProfile && currentProfile.role === 'admin') ? '' : 'none';
  });
  document.querySelectorAll('.topnav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === location.hash.split('?')[0]);
  });
}

// ---------------- Router ----------------
const routes = {
  '#/': viewServices,
  '#/login': viewLogin,
  '#/register': viewRegister,
  '#/book': viewBook,
  '#/my-bookings': viewMyBookings,
  '#/admin': viewAdmin,
};

async function router() {
  const hash = location.hash || '#/';
  const view = routes[hash] || view404;
  appEl.innerHTML = `<div class="empty-state">Loading&hellip;</div>`;
  try {
    await view();
  } catch (err) {
    console.error(err);
    appEl.innerHTML = `<div class="error-msg">Something went wrong: ${escapeHtml(err.message || String(err))}</div>`;
  }
  renderNav();
}

function view404() {
  appEl.innerHTML = `<div class="empty-state"><h2>Page not found</h2></div>`;
}

function requireAuth() {
  if (!currentUser) {
    location.hash = '#/login';
    return false;
  }
  return true;
}

// ---------------- View: Services (home) ----------------
async function viewServices() {
  if (!servicesCache.length) {
    const { data, error } = await sb.from('services').select('*').eq('active', true).order('id');
    if (error) throw error;
    servicesCache = data;
  }

  appEl.innerHTML = `
    <section class="hero">
      <div>
        <h1>SHARP CUTS.<br>NO SHORTCUTS.</h1>
        <p>Faders Touch is Dar es Salaam's appointment-first men's salon &mdash; fresh fades, clean beard lines, no waiting around.</p>
        <div style="margin-top:18px">
          <a class="btn" href="#/book">Book an appointment</a>
        </div>
      </div>
      <div class="stripe" aria-hidden="true"></div>
    </section>

    <h2 class="section-title">Our Services</h2>
    <div class="service-grid">
      ${servicesCache.map(s => `
        <div class="card">
          <h3>${escapeHtml(s.name)}</h3>
          <p class="desc" style="color:var(--cream-dim)">${escapeHtml(s.description || '')}</p>
          <p class="price" style="color:var(--brass-bright);font-weight:600;margin-top:10px">${formatTZS(s.price)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------- View: Login ----------------
function viewLogin() {
  appEl.innerHTML = `
    <div class="form-narrow">
      <h2>Log In</h2>
      <div id="formError"></div>
      <form id="loginForm">
        <label for="phone">Phone number</label>
        <input id="phone" type="tel" placeholder="07XX XXX XXX" required>
        <label for="password">Password</label>
        <input id="password" type="password" required>
        <button type="submit" style="width:100%">Log In</button>
      </form>
      <p class="form-switch">No account yet? <a href="#/register">Register</a></p>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const errEl = document.getElementById('formError');
    errEl.innerHTML = '';

    if (!isValidTanzanianPhone(phone)) {
      errEl.innerHTML = `<div class="error-msg">Please enter a valid phone number (e.g. 07XX XXX XXX).</div>`;
      return;
    }

    const { error } = await sb.auth.signInWithPassword({
      email: phoneToPseudoEmail(phone),
      password,
    });
    if (error) {
      errEl.innerHTML = `<div class="error-msg">Incorrect phone number or password.</div>`;
      return;
    }
    await refreshAuthState();
    toast('Welcome back!');
    location.hash = '#/';
  });
}

// ---------------- View: Register ----------------
function viewRegister() {
  appEl.innerHTML = `
    <div class="form-narrow">
      <h2>Create Account</h2>
      <div id="formError"></div>
      <form id="registerForm">
        <label for="name">Full name</label>
        <input id="name" type="text" required>
        <label for="phone">Phone number</label>
        <input id="phone" type="tel" placeholder="07XX XXX XXX" required>
        <label for="password">Password</label>
        <input id="password" type="password" minlength="6" required>
        <button type="submit" style="width:100%">Create Account</button>
      </form>
      <p class="form-switch">Already have an account? <a href="#/login">Log in</a></p>
    </div>
  `;
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const errEl = document.getElementById('formError');
    errEl.innerHTML = '';

    if (!isValidTanzanianPhone(phone)) {
      errEl.innerHTML = `<div class="error-msg">Please enter a valid phone number (e.g. 07XX XXX XXX).</div>`;
      return;
    }
    if (password.length < 6) {
      errEl.innerHTML = `<div class="error-msg">Password must be at least 6 characters.</div>`;
      return;
    }

    const { error } = await sb.auth.signUp({
      email: phoneToPseudoEmail(phone),
      password,
      options: { data: { name, phone } },
    });
    if (error) {
      const msg = /already registered|exists/i.test(error.message)
        ? 'An account with this phone number already exists. Please log in.'
        : error.message;
      errEl.innerHTML = `<div class="error-msg">${escapeHtml(msg)}</div>`;
      return;
    }
    await refreshAuthState();
    toast('Account created!');
    location.hash = '#/';
  });
}

// ---------------- View: Book ----------------
async function viewBook() {
  if (!requireAuth()) return;
  if (!servicesCache.length) {
    const { data, error } = await sb.from('services').select('*').eq('active', true).order('id');
    if (error) throw error;
    servicesCache = data;
  }

  appEl.innerHTML = `
    <h2 class="section-title">Book an Appointment</h2>
    <p style="color:var(--cream-dim);margin-top:-10px;margin-bottom:22px">Pick one or more services, then choose a date, time, and stylist.</p>
    <div id="formError"></div>
    <div class="service-grid" id="serviceGrid">
      ${servicesCache.map(s => `
        <div class="service-card" data-id="${s.id}" data-price="${s.price}" data-name="${escapeHtml(s.name)}">
          <h3>${escapeHtml(s.name)}</h3>
          <p class="desc">${escapeHtml(s.description || '')}</p>
          <p class="price">${formatTZS(s.price)}</p>
          <span class="check">&#10003; Selected</span>
        </div>
      `).join('')}
    </div>

    <form id="bookForm" class="card" style="margin-top:24px">
      <div class="field-row">
        <div>
          <label for="date">Date</label>
          <input id="date" type="date" min="${todayISO()}" required>
        </div>
        <div>
          <label for="time">Time</label>
          <input id="time" type="time" required>
        </div>
      </div>
      <label for="stylist">Stylist preference</label>
      <select id="stylist">
        <option value="No Preference">No Preference</option>
        <option value="Juma">Juma</option>
        <option value="Idi">Idi</option>
        <option value="Baraka">Baraka</option>
      </select>

      <div class="summary-bar">
        <span>Selected: <strong id="selCount">0</strong></span>
        <span class="total">Total: <span id="selTotal">TSh 0</span></span>
      </div>

      <button type="submit" style="width:100%;margin-top:18px">Confirm Booking</button>
    </form>
  `;

  const grid = document.getElementById('serviceGrid');
  const selCountEl = document.getElementById('selCount');
  const selTotalEl = document.getElementById('selTotal');
  selectedServiceIds = new Set();

  function updateSummary() {
    let total = 0;
    servicesCache.forEach(s => { if (selectedServiceIds.has(s.id)) total += s.price; });
    selCountEl.textContent = selectedServiceIds.size;
    selTotalEl.textContent = formatTZS(total);
  }

  grid.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.id);
      if (selectedServiceIds.has(id)) {
        selectedServiceIds.delete(id);
        card.classList.remove('selected');
      } else {
        selectedServiceIds.add(id);
        card.classList.add('selected');
      }
      updateSummary();
    });
  });

  document.getElementById('bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('formError');
    errEl.innerHTML = '';

    if (selectedServiceIds.size === 0) {
      errEl.innerHTML = `<div class="error-msg">Please select at least one service.</div>`;
      return;
    }
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const stylist = document.getElementById('stylist').value;
    if (!date || !time) {
      errEl.innerHTML = `<div class="error-msg">Please choose a date and time.</div>`;
      return;
    }
    if (date < todayISO()) {
      errEl.innerHTML = `<div class="error-msg">Booking date cannot be in the past.</div>`;
      return;
    }

    const chosen = servicesCache.filter(s => selectedServiceIds.has(s.id));
    const total = chosen.reduce((sum, s) => sum + s.price, 0);

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const { data: booking, error: bookingErr } = await sb
      .from('bookings')
      .insert({ user_id: currentUser.id, booking_date: date, booking_time: time, stylist, total })
      .select()
      .single();

    if (bookingErr) {
      errEl.innerHTML = `<div class="error-msg">${escapeHtml(bookingErr.message)}</div>`;
      submitBtn.disabled = false;
      return;
    }

    const lines = chosen.map(s => ({
      booking_id: booking.id,
      service_id: s.id,
      name_snapshot: s.name,
      price_snapshot: s.price,
    }));
    const { error: linesErr } = await sb.from('booking_services').insert(lines);
    submitBtn.disabled = false;

    if (linesErr) {
      errEl.innerHTML = `<div class="error-msg">${escapeHtml(linesErr.message)}</div>`;
      return;
    }

    toast('Booking confirmed!');
    location.hash = '#/my-bookings';
  });
}

// ---------------- View: My Bookings ----------------
async function viewMyBookings() {
  if (!requireAuth()) return;
  const { data, error } = await sb
    .from('bookings')
    .select('*, booking_services(name_snapshot, price_snapshot)')
    .eq('user_id', currentUser.id)
    .order('id', { ascending: false });
  if (error) throw error;

  if (!data.length) {
    appEl.innerHTML = `
      <h2 class="section-title">My Bookings</h2>
      <div class="empty-state">No bookings yet. <a href="#/book">Book your first appointment</a>.</div>
    `;
    return;
  }

  appEl.innerHTML = `
    <h2 class="section-title">My Bookings</h2>
    <div class="booking-list">
      ${data.map(renderBookingItem).join('')}
    </div>
  `;
}

function renderBookingItem(b, showCustomer) {
  const services = (b.booking_services || []).map(s => s.name_snapshot).join(', ');
  return `
    <div class="booking-item">
      <div class="row1">
        <span class="when">${b.booking_date} &middot; ${b.booking_time}</span>
        <span class="status">${escapeHtml(b.status)}</span>
      </div>
      <div class="services">${escapeHtml(services)} &mdash; Stylist: ${escapeHtml(b.stylist)}</div>
      ${showCustomer ? `<div class="customer">${escapeHtml(b.customer_name)} &middot; ${escapeHtml(b.customer_phone)}</div>` : ''}
      <div class="total">${formatTZS(b.total)}</div>
    </div>
  `;
}

// ---------------- View: Admin ----------------
async function viewAdmin() {
  if (!requireAuth()) return;
  if (!currentProfile || currentProfile.role !== 'admin') {
    appEl.innerHTML = `<div class="error-msg">Admin access required.</div>`;
    return;
  }

  const { data, error } = await sb
    .from('bookings')
    .select('*, booking_services(name_snapshot, price_snapshot), profiles!bookings_user_id_fkey(name, phone)')
    .order('booking_date', { ascending: false });

  if (error) throw error;

  const rows = data.map(b => ({
    ...b,
    customer_name: b.profiles?.name || 'Unknown',
    customer_phone: b.profiles?.phone || '',
  }));

  appEl.innerHTML = `
    <h2 class="section-title">All Bookings</h2>
    ${rows.length ? `<div class="booking-list">${rows.map(b => renderBookingItem(b, true)).join('')}</div>`
                  : `<div class="empty-state">No bookings yet.</div>`}
  `;
}

// ---------------- Init ----------------
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', async () => {
  await refreshAuthState();
  await router();
});
