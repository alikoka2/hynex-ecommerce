/* =========================================================
   carrello.js — Hynex Ecommerce
   Legge localStorage, mostra riepilogo, POST /api/ordini
   ========================================================= */

const SPEDIZIONE_GRATIS_SOGLIA = 80;
const SPEDIZIONE_COSTO = 5.90;

/* ─── Init ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderCart();
  setupCheckoutBtn();
});

/* ─── Render carrello ───────────────────────────────────── */
function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cartItems');
  const emptyEl   = document.getElementById('cartEmpty');
  const sidebar   = document.getElementById('orderSidebar');
  const itemCount = document.getElementById('itemCount');

  itemCount.textContent = `${cart.length} articol${cart.length === 1 ? 'o' : 'i'}`;

  if (cart.length === 0) {
    emptyEl.style.display = 'block';
    sidebar.style.display = 'none';
    container.innerHTML   = '';
    return;
  }

  emptyEl.style.display = 'none';
  sidebar.style.display = 'block';
  container.innerHTML   = '';

  cart.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="cart-item__img">
        ${item.immagine_url
          ? `<img src="${item.immagine_url}" alt="${escHtml(item.nome)}" />`
          : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1">
               <rect x="3" y="3" width="18" height="18" rx="2"/>
               <circle cx="8.5" cy="8.5" r="1.5"/>
               <polyline points="21 15 16 10 5 21"/>
             </svg>`
        }
      </div>
      <div class="cart-item__info">
        <div class="cart-item__name">${escHtml(item.nome)}</div>
        <div class="cart-item__meta">
          ${item.taglia ? `Taglia: ${escHtml(item.taglia)}` : ''}
          ${item.taglia && item.colore ? ' · ' : ''}
          ${item.colore ? `Colore: ${escHtml(item.colore)}` : ''}
        </div>
        <div class="cart-item__qty">
          <div class="qty-mini">
            <button onclick="changeItemQty(${idx}, -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="changeItemQty(${idx}, 1)">+</button>
          </div>
        </div>
      </div>
      <div class="cart-item__right">
        <div class="cart-item__price">€ ${(Number(item.prezzo) * item.qty).toFixed(2)}</div>
        <button class="cart-item__remove" onclick="removeItem(${idx})">Rimuovi</button>
      </div>
    `;
    container.appendChild(el);
  });

  updateTotals(cart);
  updateCartCount();
}

/* ─── Totali ────────────────────────────────────────────── */
function updateTotals(cart) {
  const subtotale = cart.reduce((s, i) => s + Number(i.prezzo) * i.qty, 0);
  const spedizione = subtotale >= SPEDIZIONE_GRATIS_SOGLIA ? 0 : SPEDIZIONE_COSTO;
  const totale = subtotale + spedizione;

  document.getElementById('subtotale').textContent = `€ ${subtotale.toFixed(2)}`;
  document.getElementById('spedizione').textContent =
    spedizione === 0 ? 'Gratuita' : `€ ${spedizione.toFixed(2)}`;
  document.getElementById('totale').textContent = `€ ${totale.toFixed(2)}`;

  // Abilita/disabilita checkout se carrello non vuoto
  validateCheckout();
}

/* ─── Modifica qty ──────────────────────────────────────── */
function changeItemQty(idx, delta) {
  const cart = getCart();
  cart[idx].qty = Math.max(1, (cart[idx].qty || 1) + delta);
  saveCart(cart);
  renderCart();
}

/* ─── Rimuovi item ──────────────────────────────────────── */
function removeItem(idx) {
  const cart = getCart();
  cart.splice(idx, 1);
  saveCart(cart);
  renderCart();
  showToast('Prodotto rimosso dal carrello.');
}

/* ─── Checkout button ───────────────────────────────────── */
function setupCheckoutBtn() {
  const btn = document.getElementById('btnCheckout');
  const fields = ['nome','email','indirizzo','citta','cap'];

  // Validazione live
  fields.forEach(id => {
    document.getElementById(id)?.addEventListener('input', validateCheckout);
  });

  btn.addEventListener('click', handleCheckout);
}

function validateCheckout() {
  const cart = getCart();
  if (cart.length === 0) {
    document.getElementById('btnCheckout').disabled = true;
    return;
  }

  const nome      = document.getElementById('nome')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const indirizzo = document.getElementById('indirizzo')?.value.trim();
  const citta     = document.getElementById('citta')?.value.trim();
  const cap       = document.getElementById('cap')?.value.trim();

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const capOk   = /^\d{5}$/.test(cap);

  const ok = nome && emailOk && indirizzo && citta && capOk;
  document.getElementById('btnCheckout').disabled = !ok;
}

/* ─── Submit ordine ─────────────────────────────────────── */
async function handleCheckout() {
  const btn = document.getElementById('btnCheckout');
  btn.disabled = true;
  btn.textContent = 'ELABORAZIONE...';

  const cart   = getCart();
  const subtot = cart.reduce((s, i) => s + Number(i.prezzo) * i.qty, 0);
  const sped   = subtot >= SPEDIZIONE_GRATIS_SOGLIA ? 0 : SPEDIZIONE_COSTO;
  const tot    = subtot + sped;

const payload = {
    nome_cliente:  document.getElementById('nome').value.trim(),
    email:         document.getElementById('email').value.trim(),
    indirizzo:        [
      document.getElementById('indirizzo').value.trim(),
      document.getElementById('citta').value.trim(),
      document.getElementById('cap').value.trim(),
    ].join(', '),
    totale:           tot.toFixed(2),
    prodotti: cart.map(item => ({
      id:       item.id,        // ← era prodotto_id
      quantita: item.qty,
      prezzo:   item.prezzo,
      taglia:   item.taglia || null,
      colore:   item.colore || null,
    })),
};

  try {
    const res = await fetch('http://localhost:3000/api/ordini', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Server ${res.status}`);

const data = await res.json();

// Svuota carrello
saveCart([]);
updateCartCount();

// Mostra successo
showSuccess(data.ordine_id ?? '—');

  } catch (err) {
    console.error('Checkout error:', err);
    showToast('Errore durante l\'invio dell\'ordine. Riprova.');
    btn.disabled = false;
    btn.textContent = 'CONFERMA ORDINE';
  }
}

/* ─── Success UI ────────────────────────────────────────── */
function showSuccess(ordineId) {
  document.getElementById('cartLayout').style.display = 'none';
  const success = document.getElementById('orderSuccess');
  success.style.display = 'block';
  document.getElementById('orderNumber').textContent = `Ordine #${ordineId}`;

  // Scroll top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Helpers ───────────────────────────────────────────── */
function saveCart(cart) {
  localStorage.setItem('hynex_cart', JSON.stringify(cart));
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}