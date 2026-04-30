/* =========================================================
   prodotto.js — Hynex Ecommerce
   Fetch dettaglio prodotto, gestione varianti, add to cart
   ========================================================= */

let prodotto = null;      // dati prodotto correnti
let variantiFlat = [];    // [{colore, taglia, stock}]
let selectedColor = null;
let selectedSize  = null;

/* ─── Init ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  console.log('ID prodotto:', id, '| URL:', window.location.search);

  if (!id) {
    showError('Prodotto non trovato.');
    return;
  }

  fetchProdotto(id);
});

/* ─── Fetch ─────────────────────────────────────────────── */
async function fetchProdotto(id) {
  try {
    console.log('1. Inizio fetch, id:', id);
    const res = await fetch(`http://localhost:3000/api/prodotto?id=${id}`);
    console.log('2. Risposta ricevuta, status:', res.status);
    if (!res.ok) throw new Error('Not found');
    prodotto = await res.json();
    console.log('3. Dati prodotto:', prodotto.nome);
    console.log('4. galleryMain esiste?', document.getElementById('galleryMain'));
    renderProdotto();
    console.log('5. renderProdotto completata');
  } catch (err) {
    console.error('FETCH ERROR:', err.message);
    showError('Impossibile caricare il prodotto. Riprova più tardi.');
  }
}

/* ─── Render ────────────────────────────────────────────── */
function renderProdotto() {
  const p = prodotto;

  // Breadcrumb
  document.getElementById('breadcrumbNome').textContent = p.nome;
  document.title = `${p.nome} — HYNEX`;

  // Gallery — usa immagine_url se disponibile, altrimenti placeholder SVG
  const mainEl = document.getElementById('galleryMain');
  if (!mainEl) {
    console.error('galleryMain non trovato — DOM probabilmente sovrascritto');
    return;
  }
  if (p.immagine_url) {
  mainEl.innerHTML = `<img 
    src="${p.immagine_url}" 
    alt="${p.nome}" 
    style="width:100%;height:100%;object-fit:cover;"
    onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;background:var(--grey-2);display:flex;align-items:center;justify-content:center;\\'><svg width=\\'64\\' height=\\'64\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'var(--border)\\' stroke-width=\\'1\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg></div>'"
  />`;
} else {
  mainEl.innerHTML = `<div style="width:100%;height:100%;background:var(--grey-2);display:flex;align-items:center;justify-content:center;">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  </div>`;
}

  // Se ci fosse un campo immagine_url nel DB, si userebbe:
  // mainEl.innerHTML = `<img src="${p.immagine_url}" alt="${p.nome}" />`;

  // Info testo
  document.getElementById('pCategoria').textContent = p.categoria_nome || 'Categoria';
  document.getElementById('pCategoria').className = 'product-category reveal';
  document.getElementById('pNome').textContent = p.nome;
  document.getElementById('pNome').className = 'product-title reveal';
  document.getElementById('pPrezzo').textContent = `€ ${Number(p.prezzo).toFixed(2)}`;
  document.getElementById('pPrezzo').className = 'product-price reveal';
  document.getElementById('pDescrizione').textContent = p.descrizione || 'Nessuna descrizione disponibile.';
  document.getElementById('pDescrizione').className = 'product-description reveal';

  // Dettagli accordion
  document.getElementById('dettagliText').textContent =
    p.descrizione || 'Nessun dettaglio aggiuntivo.';

  // Varianti
  variantiFlat = p.varianti || [];
  buildColorSelector();
  buildSizeSelector();

  // Attiva CTA se varianti
  if (variantiFlat.length === 0) {
    // Prodotto senza varianti: aggiungi direttamente
    document.getElementById('btnAddCart').disabled = false;
    document.getElementById('btnAddCart').addEventListener('click', addToCartDirect);
    const sb = document.getElementById('stockBadge');
    document.getElementById('stockInfo').style.display = 'block';
    document.getElementById('stockText').textContent = 'Disponibile';
  }

  // Pulsante add-to-cart
  document.getElementById('btnAddCart').addEventListener('click', handleAddToCart);

  // Reveal animations
  document.querySelectorAll('.reveal').forEach(el => observeReveal(el));
}

/* ─── Selettore colori ──────────────────────────────────── */
function buildColorSelector() {
  const colori = [...new Set(variantiFlat.map(v => v.colore).filter(Boolean))];
  if (colori.length === 0) return;

  const section = document.getElementById('colorSection');
  const grid    = document.getElementById('colorGrid');
  section.classList.remove('p-hidden');

  // Mappa nome→hex semplice (espandibile)
  const colorMap = {
    'nero': '#111', 'bianco': '#eee', 'bianco sporco': '#f5f0e8',
    'grigio': '#888', 'rosso': '#c0392b', 'blu': '#1a3c6e',
    'verde': '#2d6a4f', 'beige': '#d4b896', 'marrone': '#6b3a2a',
    'arancione': '#e67e22', 'giallo': '#f1c40f', 'viola': '#7d3c98',
    'navy': '#001f5b', 'militare': '#4b5320', 'ecru': '#c8c0a0',
  };

  colori.forEach(colore => {
    const hex = colorMap[colore.toLowerCase()] || '#555';
    const btn = document.createElement('button');
    btn.className = 'color-btn';
    btn.style.background = hex;
    btn.title = colore;
    btn.dataset.colore = colore;
    btn.setAttribute('aria-label', colore);
    btn.addEventListener('click', () => selectColor(colore, btn));
    grid.appendChild(btn);
  });
}

function selectColor(colore, btn) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedColor = colore;
  document.getElementById('selectedColorLabel').textContent = colore;

  // Aggiorna disponibilità taglie
  refreshSizeAvailability();
  checkCTAState();
}

/* ─── Selettore taglie ──────────────────────────────────── */
function buildSizeSelector() {
  const taglie = [...new Set(variantiFlat.map(v => v.taglia).filter(Boolean))];
  if (taglie.length === 0) return;

  // Ordine standard
  const order = ['XS','S','M','L','XL','XXL','XXXL','ONE SIZE'];
  taglie.sort((a,b) => {
    const ia = order.indexOf(a.toUpperCase());
    const ib = order.indexOf(b.toUpperCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const section = document.getElementById('sizeSection');
  const grid    = document.getElementById('sizeGrid');
  section.classList.remove('p-hidden');

  taglie.forEach(taglia => {
    const btn = document.createElement('button');
    btn.className = 'size-btn';
    btn.textContent = taglia;
    btn.dataset.taglia = taglia;
    btn.addEventListener('click', () => selectSize(taglia, btn));
    grid.appendChild(btn);
  });
}

function refreshSizeAvailability() {
  document.querySelectorAll('.size-btn').forEach(btn => {
    const taglia = btn.dataset.taglia;
    const variante = variantiFlat.find(v =>
      v.taglia === taglia &&
      (!selectedColor || v.colore === selectedColor)
    );
    const disponibile = variante && (variante.quantita_stock ?? variante.stock ?? 0) > 0;
    btn.disabled = !disponibile;
    if (btn.classList.contains('selected') && !disponibile) {
      btn.classList.remove('selected');
      selectedSize = null;
      document.getElementById('selectedSizeLabel').textContent = '—';
    }
  });
  updateStockBadge();
}

function selectSize(taglia, btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSize = taglia;
  document.getElementById('selectedSizeLabel').textContent = taglia;

  updateStockBadge();
  checkCTAState();
}

/* ─── Stock badge ───────────────────────────────────────── */
function updateStockBadge() {
  const stockInfo = document.getElementById('stockInfo');
  if (!selectedSize && variantiFlat.length > 0) {
    stockInfo.classList.add('p-hidden');
    return;
  }

  const variante = variantiFlat.find(v =>
    v.taglia === selectedSize &&
    (!selectedColor || v.colore === selectedColor)
  );

  stockInfo.classList.remove('p-hidden');
  const badge = document.getElementById('stockBadge');
  const text  = document.getElementById('stockText');

  const stock = variante?.quantita_stock ?? variante?.stock ?? 0;
  if (!variante || stock === 0) {
    badge.className = 'stock-badge out';
    text.textContent = 'Esaurito';
  } else if (stock <= 3) {
    badge.className = 'stock-badge low';
    text.textContent = `Ultimi ${stock} rimasti`;
  } else {
    badge.className = 'stock-badge';
    text.textContent = `Disponibile (${stock})`;
  }

  if (variante) {
    document.getElementById('qtyInput').max = stock;
  }
}

/* ─── CTA state ─────────────────────────────────────────── */
function checkCTAState() {
  const btn = document.getElementById('btnAddCart');
  const hasColor  = !document.getElementById('colorSection').style.display || selectedColor;
  const hasSize   = !document.getElementById('sizeSection').style.display || selectedSize;

  const colorRequired = !document.getElementById('colorSection').classList.contains('p-hidden');
  const sizeRequired  = !document.getElementById('sizeSection').classList.contains('p-hidden');

  const ok = (!colorRequired || selectedColor) && (!sizeRequired || selectedSize);
  btn.disabled = !ok;
}

/* ─── Qty ───────────────────────────────────────────────── */
function changeQty(delta) {
  const input = document.getElementById('qtyInput');
  const max   = parseInt(input.max) || 99;
  let val = parseInt(input.value) + delta;
  val = Math.max(1, Math.min(val, max));
  input.value = val;
}

/* ─── Add to Cart ───────────────────────────────────────── */
function handleAddToCart() {
  if (!prodotto) return;

  const qty = parseInt(document.getElementById('qtyInput').value) || 1;

  addToCart({
    id:     prodotto.id,
    nome:   prodotto.nome,
    prezzo: prodotto.prezzo,
    taglia: selectedSize  || null,
    colore: selectedColor || null,
    qty,
  });

  showToast(`${prodotto.nome} aggiunto al carrello ✓`);
  updateCartCount();
}

function addToCartDirect() {
  handleAddToCart();
}

/* ─── Cart count ────────────────────────────────────────── */
function updateCartCount() {
  const cart  = typeof getCart === 'function' ? getCart() : [];
  const total = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const el    = document.getElementById('cartCount');
  if (el) el.textContent = total;
}

/* ─── Accordion ─────────────────────────────────────────── */
function toggleAccordion(trigger) {
  const body = trigger.nextElementSibling;
  const isOpen = body.classList.contains('open');

  // Chiudi tutti
  document.querySelectorAll('.accordion-body').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.accordion-trigger').forEach(t => t.classList.remove('open'));

  if (!isOpen) {
    body.classList.add('open');
    trigger.classList.add('open');
  }
}

/* ─── Error ─────────────────────────────────────────────── */
function showError(msg) {
  document.querySelector('.product-detail').innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:6rem 0;color:var(--grey);">
      <p style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--white);">OOPS</p>
      <p>${msg}</p>
      <a href="catalogo.html" class="btn btn-outline" style="margin-top:2rem;display:inline-block;">← Torna al catalogo</a>
    </div>`;
}