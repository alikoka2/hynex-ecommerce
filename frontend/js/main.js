/* ============================================
   HYNEX — main.js
   Funzioni condivise da tutte le pagine
   ============================================ */

/* ── Navbar scroll effect ──────────────────── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ── Hamburger menu (mobile) ───────────────── */
const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    const nav = document.querySelector('.navbar__nav');
    const isOpen = nav.classList.toggle('is-open');

    const spans = hamburger.querySelectorAll('span');
    spans[0].style.transform = isOpen ? 'translateY(6.5px) rotate(45deg)' : '';
    spans[1].style.opacity   = isOpen ? '0' : '';
    spans[2].style.transform = isOpen ? 'translateY(-6.5px) rotate(-45deg)' : '';
  });

  // Chiudi menu cliccando un link
  document.querySelectorAll('.navbar__nav a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelector('.navbar__nav').classList.remove('is-open');
      const spans = hamburger.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    });
  });
}

/* ── Active nav link ───────────────────────── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navbar__nav a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  } else {
    a.classList.remove('active');
  }
});

/* ── Cart helpers ──────────────────────────── */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('hynex_cart')) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('hynex_cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = total;
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id && i.taglia === item.taglia && i.colore === item.colore);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
  showToast(`"${item.nome}" aggiunto al carrello`);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

/* ── Toast ─────────────────────────────────── */
function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ── Scroll reveal ─────────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

function observeReveal(el) {
  revealObserver.observe(el);
}

// Osserva tutti gli elementi .reveal già presenti nel DOM
document.querySelectorAll('.reveal').forEach(observeReveal);

/* ── Contatori animati ─────────────────────── */
function animateCounter(el) {
  const text = el.textContent.trim();
  const num = parseFloat(text);
  if (isNaN(num)) return; // salta ∞, 48h, ecc.

  const suffix = text.replace(/[\d.]/g, ''); // es. '+' o '%'
  const duration = 1600;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.floor(eased * num) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-box__num').forEach(el => counterObserver.observe(el));

/* ── Page transition fade ──────────────────── */
(function initPageTransition() {
  document.body.classList.remove('page-exit');

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || a.target === '_blank') return;
    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(() => { window.location.href = href; }, 260);
  });

  window.addEventListener('pageshow', e => {
    if (e.persisted) document.body.classList.remove('page-exit');
  });
})();

/* ── Init ──────────────────────────────────── */
updateCartCount();