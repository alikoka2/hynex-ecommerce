/**
 * admin.js — Dashboard Hynex
 * Consuma GET /api/statistiche e popola KPI, ordini recenti, categorie
 */

const API_BASE = 'http://localhost:3000';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  caricaDashboard();
});

// ============================================================
// FETCH STATISTICHE
// ============================================================
async function caricaDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/statistiche`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dati = await res.json();

    renderKPI(dati);
    renderOrdiniRecenti(dati.ordini_recenti);
    renderCategorie(dati.categorie);

  } catch (err) {
    console.error('Errore caricamento dashboard:', err);
    mostraErrore();
  }
}

// ============================================================
// KPI CARDS
// ============================================================
function renderKPI(dati) {
  const fatturato = parseFloat(dati.fatturato_totale) || 0;
  const ordini    = parseInt(dati.totale_ordini) || 0;
  const prodotti  = dati.categorie.reduce((acc, c) => acc + parseInt(c.numero_prodotti || 0), 0);
  const categorie = dati.categorie.length;

  // Fatturato
  const kpiFatturato = document.getElementById('kpi-fatturato');
  kpiFatturato.classList.remove('loading');
  kpiFatturato.textContent = `€ ${fatturato.toFixed(2).replace('.', ',')}`;
  document.getElementById('kpi-fatturato-sub').textContent =
    ordini > 0 ? `media € ${(fatturato / ordini).toFixed(2).replace('.', ',')} / ordine` : 'nessun ordine';

  // Ordini
  const kpiOrdini = document.getElementById('kpi-ordini');
  kpiOrdini.classList.remove('loading');
  kpiOrdini.textContent = ordini;
  document.getElementById('kpi-ordini-sub').textContent =
    ordini === 0 ? 'nessun ordine ancora' : ordini === 1 ? '1 ordine ricevuto' : `${ordini} ordini ricevuti`;

  // Prodotti
  const kpiProdotti = document.getElementById('kpi-prodotti');
  kpiProdotti.classList.remove('loading');
  kpiProdotti.textContent = prodotti;
  document.getElementById('kpi-prodotti-sub').textContent = `in ${categorie} categori${categorie === 1 ? 'a' : 'e'}`;

  // Categorie
  const kpiCategorie = document.getElementById('kpi-categorie');
  kpiCategorie.classList.remove('loading');
  kpiCategorie.textContent = categorie;
  document.getElementById('kpi-categorie-sub').textContent = 'sezioni attive';
}

// ============================================================
// TABELLA ORDINI RECENTI
// ============================================================
function renderOrdiniRecenti(ordini) {
  const tbody = document.getElementById('ordini-tbody');

  if (!ordini || ordini.length === 0) {
    // Nessun ordine: mostra messaggio vuoto
    tbody.closest('table').remove();
    document.getElementById('ordini-container').innerHTML = `
      <div class="admin-error">
        <div class="admin-error__icon">📋</div>
        <div class="admin-error__msg">Nessun ordine ancora.<br>Gli ordini appariranno qui dopo il primo acquisto.</div>
      </div>`;
    return;
  }

  const righe = ordini.map(o => {
    const data = formattaData(o.data_ordine);
    const totale = parseFloat(o.totale).toFixed(2).replace('.', ',');
    return `
      <tr>
        <td><span class="ordine-id">#${o.id}</span></td>
        <td>
          <div class="ordine-cliente">${escHTML(o.nome_cliente)}</div>
          <div class="ordine-email">${escHTML(o.email)}</div>
        </td>
        <td><span class="ordine-totale">€ ${totale}</span></td>
        <td><span class="ordine-data">${data}</span></td>
      </tr>`;
  }).join('');

  tbody.innerHTML = righe;
}

// ============================================================
// LISTA CATEGORIE con barra proporzionale
// ============================================================
function renderCategorie(categorie) {
  const container = document.getElementById('categorie-list');

  if (!categorie || categorie.length === 0) {
    container.innerHTML = `
      <div class="admin-error">
        <div class="admin-error__icon">📦</div>
        <div class="admin-error__msg">Nessuna categoria trovata.</div>
      </div>`;
    return;
  }

  const maxProdotti = Math.max(...categorie.map(c => parseInt(c.numero_prodotti || 0)), 1);

  const items = categorie.map(c => {
    const count   = parseInt(c.numero_prodotti || 0);
    const pct     = Math.round((count / maxProdotti) * 100);
    const prezzoMedio = parseFloat(c.prezzo_medio || 0);
    const prezzoStr = prezzoMedio > 0
      ? `prezzo medio € ${prezzoMedio.toFixed(2).replace('.', ',')}`
      : 'nessun prodotto';

    return `
      <div class="categoria-item">
        <div class="categoria-item__nome">${escHTML(c.nome)}</div>
        <div class="categoria-item__stats">
          <div class="categoria-item__count">${count}</div>
          <div class="categoria-item__prezzo">${prezzoStr}</div>
        </div>
      </div>
      <div class="categoria-bar">
        <div class="categoria-bar__fill" data-pct="${pct}"></div>
      </div>`;
  }).join('');

  container.innerHTML = items;

  // Anima le barre dopo il render (rAF per garantire il reflow)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.querySelectorAll('.categoria-bar__fill').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    });
  });
}

// ============================================================
// STATO ERRORE GLOBALE
// ============================================================
function mostraErrore() {
  // KPI in errore
  ['kpi-fatturato', 'kpi-ordini', 'kpi-prodotti', 'kpi-categorie'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('loading');
    el.textContent = '—';
  });
  ['kpi-fatturato-sub', 'kpi-ordini-sub', 'kpi-prodotti-sub', 'kpi-categorie-sub'].forEach(id => {
    document.getElementById(id).textContent = 'errore di connessione';
  });

  // Sezione ordini
  document.getElementById('ordini-container').innerHTML = `
    <div class="admin-error">
      <div class="admin-error__icon">⚠️</div>
      <div class="admin-error__msg">
        Impossibile connettersi al server.<br>
        Assicurati che Node.js sia avviato su localhost:3000.
      </div>
      <button class="admin-error__retry" onclick="location.reload()">Riprova</button>
    </div>`;

  // Sezione categorie
  document.getElementById('categorie-list').innerHTML = `
    <div class="admin-error">
      <div class="admin-error__msg">Dati non disponibili.</div>
    </div>`;
}

// ============================================================
// UTILITY
// ============================================================

/**
 * Formatta una data ISO o MySQL in formato italiano leggibile
 * es: "2024-03-15T10:30:00.000Z" → "15 mar 2024, 10:30"
 */
function formattaData(dataStr) {
  if (!dataStr) return '—';
  try {
    const d = new Date(dataStr);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) + ', ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dataStr;
  }
}

/**
 * Escape HTML per evitare XSS nei dati dal DB
 */
function escHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}