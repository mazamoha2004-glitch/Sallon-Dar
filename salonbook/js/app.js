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

// ---------------- Salon details (edit these) ----------------
const SALON = {
  phone: '+255 700 000 000',
  whatsapp: '255700000000',
  address: 'Dar es Salaam, Tanzania',
  hours: [
    ['Mon – Fri', '9:00 – 20:00'],
    ['Saturday', '8:00 – 21:00'],
    ['Sunday', '10:00 – 18:00'],
  ],
};

// ---------------- Icons & image helpers ----------------
const ICONS = {
  scissors: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="36" r="6"/><path d="M17 15l24 21M17 33L41 12"/></svg>',
  massage: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 30c0-9 6-16 14-16s14 7 14 16"/><path d="M14 30v6M22 32v6M30 32v6M38 30v6"/><path d="M24 6v4M14 9l2 3M34 9l-2 3"/></svg>',
  razor: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="14" width="30" height="8" rx="2"/><path d="M36 18h6M10 22v8M18 22v8M26 22v8M6 36h36"/></svg>',
  drop: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6c8 10 12 16 12 22a12 12 0 0 1-24 0c0-6 4-12 12-22z"/><path d="M18 30a6 6 0 0 0 6 6"/></svg>',
  comb: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="12" width="38" height="10" rx="2"/><path d="M10 22v12M16 22v12M22 22v12M28 22v12M34 22v12M40 22v12"/></svg>',
  clock: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="17"/><path d="M24 14v10l7 5"/></svg>',
  star: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l5.5 11.5 12.5 1.7-9.1 8.8 2.2 12.5L24 34.6 12.9 40.5l2.2-12.5L6 19.2l12.5-1.7z"/></svg>',
  phone: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6h8l3 10-5 3a24 24 0 0 0 11 11l3-5 10 3v8a4 4 0 0 1-4 4A34 34 0 0 1 8 10a4 4 0 0 1 4-4z"/></svg>',
  pin: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 44S9 30 9 19a15 15 0 0 1 30 0c0 11-15 25-15 25z"/><circle cx="24" cy="19" r="5"/></svg>',
};

function iconFor(serviceName) {
  const n = (serviceName || '').toLowerCase();
  if (n.includes('massage')) return ICONS.massage;
  if (n.includes('beard') || n.includes('shave')) return ICONS.razor;
  if (n.includes('dye') || n.includes('color') || n.includes('colour')) return ICONS.drop;
  if (n.includes('hair') || n.includes('cut')) return ICONS.scissors;
  return ICONS.comb;
}

// Photo with graceful fallback: drop real photos in /images and they appear
// automatically. If a file is missing, a styled placeholder shows instead.
function photo(src, alt, icon = ICONS.scissors, cls = '') {
  return `<div class="ph ${cls}">
    <span class="ph-icon">${icon}</span>
    <img src="${src}" alt="${escapeHtml(alt)}" loading="lazy"
         onerror="this.remove()" onload="this.parentElement.classList.add('has-img')">
  </div>`;
}

// ---------------- View: Services (home) ----------------
async function viewServices() {
  if (!servicesCache.length) {
    const { data, error } = await sb.from('services').select('*').eq('active', true).order('id');
    if (error) throw error;
    servicesCache = data;
  }

  appEl.innerHTML = `
    <section class="hero2">
      <div class="hero2-copy">
        <span class="eyebrow">Men's Salon &middot; Dar es Salaam</span>
        <h1>SHARP CUTS.<br><em>NO SHORTCUTS.</em></h1>
        <p>Appointment-first grooming. Fresh fades, clean beard lines and a proper head massage &mdash; without the waiting around.</p>
        <div class="hero2-cta">
          <a class="btn" href="#/book">Book an appointment</a>
          <a class="btn secondary" href="#services">See services</a>
        </div>
        <ul class="hero2-stats">
          <li><strong>${servicesCache.length}</strong><span>Signature services</span></li>
          <li><strong>7 days</strong><span>Open every week</span></li>
          <li><strong>2 min</strong><span>To book online</span></li>
        </ul>
      </div>
      <div class="hero2-art">
        ${photo('images/hero.jpg', 'Barber giving a fade haircut', ICONS.scissors, 'hero-ph')}
        <div class="pole-tag" aria-hidden="true"></div>
      </div>
    </section>

    <section class="features">
      <div><span class="f-ico">${ICONS.clock}</span><h3>On time</h3><p>Book a slot and we hold it for you.</p></div>
      <div><span class="f-ico">${ICONS.razor}</span><h3>Clean tools</h3><p>Sanitised clippers and fresh blades.</p></div>
      <div><span class="f-ico">${ICONS.star}</span><h3>Skilled barbers</h3><p>Pick your stylist or let us match you.</p></div>
    </section>

    <h2 class="section-title" id="services">Our Services</h2>
    <div class="service-showcase">
      ${servicesCache.map(s => `
        <article class="svc">
          ${photo(`images/service-${s.id}.jpg`, s.name, iconFor(s.name), 'svc-ph')}
          <div class="svc-body">
            <div class="svc-top"><h3>${escapeHtml(s.name)}</h3><span class="svc-price">${formatTZS(s.price)}</span></div>
            <p>${escapeHtml(s.description || '')}</p>
            <a href="#/book">Book this &rarr;</a>
          </div>
        </article>
      `).join('')}
    </div>

    <h2 class="section-title">The Shop</h2>
    <div class="gallery">
      ${[1,2,3,4,5,6].map(i => photo(`images/gallery-${i}.jpg`, 'Faders Touch salon', i % 2 ? ICONS.comb : ICONS.scissors, 'g-ph g' + i)).join('')}
    </div>

    <section class="visit">
      <div class="visit-card">
        <h2>Visit Us</h2>
        <p class="v-row"><span class="v-ico">${ICONS.pin}</span>${escapeHtml(SALON.address)}</p>
        <p class="v-row"><span class="v-ico">${ICONS.phone}</span><a href="tel:${SALON.phone.replace(/\s/g, '')}">${escapeHtml(SALON.phone)}</a></p>
        <a class="btn wa" href="https://wa.me/${SALON.whatsapp}" target="_blank" rel="noopener">Chat on WhatsApp</a>
      </div>
      <div class="visit-card">
        <h2>Opening Hours</h2>
        <table class="hours">
          ${SALON.hours.map(([d, h]) => `<tr><td>${d}</td><td>${h}</td></tr>`).join('')}
        </table>
      </div>
    </section>

    <section class="cta-band">
      <h2>READY FOR A FRESH LOOK?</h2>
      <a class="btn" href="#/book">Book now</a>
    </section>
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
          <span class="svc-ico">${iconFor(s.name)}</span>
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
