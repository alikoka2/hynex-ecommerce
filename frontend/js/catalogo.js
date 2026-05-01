/* ============================================
   HYNEX — catalogo.js
   Gestisce: fetch prodotti/categorie, filtri,
   ordinamento, grid toggle, URL params
   ============================================ */

/* ── Stato globale ─────────────────────────── */
let allProducts   = [];   // tutti i prodotti dal DB
let filteredProducts = []; // dopo i filtri
let activeCatId   = null; // id categoria selezionata
let maxPrice      = 300;  // prezzo max slider
let sliderMax     = 300;  // valore massimo assoluto dello slider
let availFilter   = 'all';
let sortMode      = 'default';
let gridCols      = 4;

/* ── Init ──────────────────────────────────── */
async function init() {
  readUrlParams();
  await Promise.all([loadCategorie(), loadProdotti()]);
  setupControls();
}

/* ── URL params ────────────────────────────── */
function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('categoria')) activeCatId = parseInt(params.get('categoria'));
  if (params.get('cat')) {
    // filtro per slug testuale (es. ?cat=t-shirt)
    window._catSlug = params.get('cat');
  }
}

/* ── Fetch categorie ───────────────────────── */
async function loadCategorie() {
  try {
    const res = await fetch('http://localhost:3000/api/categorie');
    const cats = await res.json();

    const list = document.getElementById('categorieList');
    list.innerHTML = '';

    // "Tutti" chip
    const tuttiBtn = document.createElement('button');
    tuttiBtn.className = 'filter-chip' + (activeCatId === null ? ' active' : '');
    tuttiBtn.innerHTML = '<span class="filter-chip__dot"></span> Tutti';
    tuttiBtn.addEventListener('click', () => setCat(null));
    list.appendChild(tuttiBtn);

    cats.forEach(c => {
      // Se è arrivato come slug testuale, prova a matchare
      if (window._catSlug && c.nome.toLowerCase().includes(window._catSlug)) {
        activeCatId = c.id;
        window._catSlug = null;
      }

      const btn = document.createElement('button');
      btn.className = 'filter-chip' + (activeCatId === c.id ? ' active' : '');
      btn.innerHTML = `<span class="filter-chip__dot"></span> ${c.nome}`;
      btn.dataset.id = c.id;
      btn.addEventListener('click', () => setCat(c.id));
      list.appendChild(btn);
    });

    // Aggiorna subtitle pagina
    if (activeCatId) {
      const cat = cats.find(c => c.id === activeCatId);
      if (cat) document.getElementById('pageSubtitle').textContent = cat.nome;
    }

  } catch (err) {
    console.error('Errore categorie:', err);
  }
}

/* ── Fetch prodotti ────────────────────────── */
async function loadProdotti() {
  try {
    const res = await fetch('http://localhost:3000/api/prodotti');
    allProducts = await res.json();

    // Calcola prezzo massimo reale
    const prezzoMax = Math.max(...allProducts.map(p => parseFloat(p.prezzo) || 0));
    sliderMax = Math.ceil(prezzoMax / 10) * 10 || 300;
    maxPrice  = sliderMax;

    const slider = document.getElementById('priceRange');
    slider.max   = sliderMax;
    slider.value = sliderMax;
    document.getElementById('priceLabel').textContent = sliderMax;

    applyFilters();
  } catch (err) {
    console.error('Errore prodotti:', err);
    document.getElementById('catalogGrid').innerHTML = `
      <div class="empty-state">
        <svg class="empty-state__icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="empty-state__title">SERVER OFFLINE</p>
        <p class="empty-state__sub">Assicurati che il server Node.js sia avviato su porta 3000</p>
      </div>`;
  }
}

/* ── Filtra + Ordina + Render ──────────────── */
function applyFilters() {
  let list = [...allProducts];

  // Filtro categoria
  if (activeCatId !== null) {
    list = list.filter(p => p.categoria_id === activeCatId || p.id_categoria === activeCatId);
  }

  // Filtro prezzo
  list = list.filter(p => parseFloat(p.prezzo) <= maxPrice);

  // Filtro disponibilità
  if (availFilter === 'available') {
    list = list.filter(p => p.disponibile !== 0 && p.disponibile !== false);
  }

  // Ordinamento
  switch (sortMode) {
    case 'price-asc':  list.sort((a,b) => parseFloat(a.prezzo) - parseFloat(b.prezzo)); break;
    case 'price-desc': list.sort((a,b) => parseFloat(b.prezzo) - parseFloat(a.prezzo)); break;
    case 'name-asc':   list.sort((a,b) => a.nome.localeCompare(b.nome)); break;
    case 'name-desc':  list.sort((a,b) => b.nome.localeCompare(a.nome)); break;
  }

  filteredProducts = list;
  renderProducts();
  updateToolbar();
}

/* ── Render cards ──────────────────────────── */
function renderProducts() {
  const grid = document.getElementById('catalogGrid');
  grid.innerHTML = '';

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state__icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p class="empty-state__title">NESSUN RISULTATO</p>
        <p class="empty-state__sub">Prova a modificare i filtri</p>
        <button class="empty-state__reset" id="emptyReset">Azzera filtri</button>
      </div>`;
    document.getElementById('emptyReset')?.addEventListener('click', resetAll);
    return;
  }

  filteredProducts.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card reveal';
    card.style.transitionDelay = `${Math.min(i, 8) * 0.04}s`;

    card.innerHTML = `
    <div class="product-card__img-wrap">
      ${p.immagine_url
        ? `<img class="product-card__img" src="${p.immagine_url}" alt="${p.nome}" loading="lazy"
              onerror="this.parentElement.innerHTML='<div class=\\'product-card__placeholder\\'><svg width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'white\\' stroke-width=\\'1\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg></div>'" />`
        : `<div class="product-card__placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>`
      }
        <button class="product-card__quick-add"
          data-id="${p.id}">
          Scegli →
        </button>
      </div>
      <div class="product-card__info">
        <div class="product-card__category">${p.categoria_nome || '—'}</div>
        <div class="product-card__name">${p.nome}</div>
        <div class="product-card__price">€ ${parseFloat(p.prezzo).toFixed(2)}</div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('product-card__quick-add')) {
        window.location.href = `prodotto.html?id=${p.id}`;
      }
    });

    grid.appendChild(card);
    observeReveal(card);
  });

  // Quick add listeners
  grid.querySelectorAll('.product-card__quick-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `prodotto.html?id=${btn.dataset.id}`;
    });
  });
}

/* ── Aggiorna toolbar ──────────────────────── */
function updateToolbar() {
  // Contatore
  const count = document.getElementById('catalogCount');
  count.innerHTML = `<strong>${filteredProducts.length}</strong> prodott${filteredProducts.length === 1 ? 'o' : 'i'}`;

  // Tag filtri attivi
  const container = document.getElementById('activeFilters');
  container.innerHTML = '';

  if (activeCatId !== null) {
    const chip = document.querySelector(`.filter-chip[data-id="${activeCatId}"]`);
    const nome = chip ? chip.textContent.trim() : `Cat. ${activeCatId}`;
    addActiveTag(container, nome, () => setCat(null));
  }

  if (maxPrice < sliderMax) {
    addActiveTag(container, `Max € ${maxPrice}`, () => {
      maxPrice = sliderMax;
      document.getElementById('priceRange').value = sliderMax;
      document.getElementById('priceLabel').textContent = sliderMax;
      applyFilters();
    });
  }

  if (availFilter === 'available') {
    addActiveTag(container, 'Disponibili', () => {
      availFilter = 'all';
      document.querySelectorAll('[data-avail]').forEach(b => {
        b.classList.toggle('active', b.dataset.avail === 'all');
      });
      applyFilters();
    });
  }
}

function addActiveTag(container, label, onRemove) {
  const tag = document.createElement('button');
  tag.className = 'active-filter-tag';
  tag.innerHTML = `${label} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  tag.addEventListener('click', onRemove);
  container.appendChild(tag);
}

/* ── Set categoria ─────────────────────────── */
function setCat(id) {
  activeCatId = id;
  document.querySelectorAll('.filter-chip[data-id]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.id) === id);
  });
  // "Tutti" chip
  const tuttiChip = document.querySelector('.filter-chip:not([data-id]):not([data-avail])');
  if (tuttiChip) tuttiChip.classList.toggle('active', id === null);

  // Aggiorna subtitle
  if (id === null) {
    document.getElementById('pageSubtitle').textContent = 'Tutti i prodotti';
  } else {
    const chip = document.querySelector(`.filter-chip[data-id="${id}"]`);
    if (chip) document.getElementById('pageSubtitle').textContent = chip.textContent.trim();
  }

  applyFilters();
}

/* ── Reset tutto ───────────────────────────── */
function resetAll() {
  activeCatId  = null;
  maxPrice     = sliderMax;
  availFilter  = 'all';
  sortMode     = 'default';

  document.getElementById('priceRange').value  = sliderMax;
  document.getElementById('priceLabel').textContent = sliderMax;
  document.getElementById('sortSelect').value  = 'default';
  document.getElementById('pageSubtitle').textContent = 'Tutti i prodotti';

  document.querySelectorAll('.filter-chip').forEach(b => {
    const isAll = !b.dataset.id && b.dataset.avail !== 'available';
    b.classList.toggle('active', isAll);
  });
  document.querySelectorAll('[data-avail]').forEach(b => {
    b.classList.toggle('active', b.dataset.avail === 'all');
  });

  applyFilters();
}

/* ── Setup controlli ───────────────────────── */
function setupControls() {
  // Slider prezzo
  document.getElementById('priceRange').addEventListener('input', (e) => {
    maxPrice = parseInt(e.target.value);
    document.getElementById('priceLabel').textContent = maxPrice;
    applyFilters();
  });

  // Reset categoria
  document.getElementById('resetCategoria').addEventListener('click', () => setCat(null));

  // Reset prezzo
  document.getElementById('resetPrezzo').addEventListener('click', () => {
    maxPrice = sliderMax;
    document.getElementById('priceRange').value = sliderMax;
    document.getElementById('priceLabel').textContent = sliderMax;
    applyFilters();
  });

  // Disponibilità
  document.querySelectorAll('[data-avail]').forEach(btn => {
    btn.addEventListener('click', () => {
      availFilter = btn.dataset.avail;
      document.querySelectorAll('[data-avail]').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      applyFilters();
    });
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    sortMode = e.target.value;
    applyFilters();
  });

  // Grid toggle
  const grid = document.getElementById('catalogGrid');
  document.getElementById('grid4btn').addEventListener('click', () => {
    gridCols = 4;
    grid.className = 'grid-products catalog-grid cols-4';
    document.getElementById('grid4btn').classList.add('active');
    document.getElementById('grid2btn').classList.remove('active');
  });
  document.getElementById('grid2btn').addEventListener('click', () => {
    gridCols = 2;
    grid.className = 'grid-products catalog-grid cols-2';
    document.getElementById('grid2btn').classList.add('active');
    document.getElementById('grid4btn').classList.remove('active');
  });

  // Sidebar mobile
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const toggle   = document.getElementById('sidebarToggle');

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', closeSidebar);
}

/* ── Start ─────────────────────────────────── */
init();