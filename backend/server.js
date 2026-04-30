const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const PORT = 3000;

function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File non trovato');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function getQueryParams(url) {
  const params = {};
  const queryString = url.split('?')[1];
  if (!queryString) return params;
  queryString.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return params;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];
  const params = getQueryParams(req.url);

  // GET tutti i prodotti (con filtro categoria opzionale)
  if (req.method === 'GET' && urlPath === '/api/prodotti') {
    let query = `
      SELECT p.*, c.nome AS categoria_nome
      FROM prodotti p
      LEFT JOIN categorie c ON p.categoria_id = c.id
      WHERE p.disponibile = TRUE
    `;
    const values = [];
    if (params.categoria_id) {
      query += ' AND p.categoria_id = ?';
      values.push(params.categoria_id);
    }
    db.query(query, values, (err, results) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ errore: err.message })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
    return;
  }

  // GET singolo prodotto con varianti
  if (req.method === 'GET' && urlPath === '/api/prodotto') {
    const id = params.id;
    db.query(
      'SELECT p.*, c.nome AS categoria_nome FROM prodotti p LEFT JOIN categorie c ON p.categoria_id = c.id WHERE p.id = ?',
      [id],
      (err, prodotti) => {
        if (err || prodotti.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ errore: 'Prodotto non trovato' }));
          return;
        }
        db.query('SELECT * FROM varianti WHERE prodotto_id = ?', [id], (err2, varianti) => {
          const risultato = { ...prodotti[0], varianti };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(risultato));
        });
      }
    );
    return;
  }

  // GET tutte le categorie
  if (req.method === 'GET' && urlPath === '/api/categorie') {
    db.query('SELECT * FROM categorie', (err, results) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ errore: err.message })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    });
    return;
  }

  // POST nuovo ordine
  if (req.method === 'POST' && urlPath === '/api/ordini') {
    const body = await parseBody(req);
    const { nome_cliente, email, indirizzo, totale, prodotti } = body;
    db.query(
      'INSERT INTO ordini (nome_cliente, email, indirizzo, totale) VALUES (?, ?, ?, ?)',
      [nome_cliente, email, indirizzo, totale],
      (err, result) => {
        if (err) { res.writeHead(500); res.end(JSON.stringify({ errore: err.message })); return; }
        const ordineId = result.insertId;
        const valori = prodotti.map(p => [ordineId, p.id, p.quantita, p.prezzo]);
        db.query(
          'INSERT INTO ordini_prodotti (ordine_id, prodotto_id, quantita, prezzo_unitario) VALUES ?',
          [valori],
          (err2) => {
            if (err2) { res.writeHead(500); res.end(JSON.stringify({ errore: err2.message })); return; }
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ successo: true, ordine_id: ordineId }));
          }
        );
      }
    );
    return;
  }

// GET statistiche
if (req.method === 'GET' && urlPath === '/api/statistiche') {
  // Query 1: prodotti per categoria
  db.query(`
    SELECT c.nome, COUNT(p.id) AS numero_prodotti, AVG(p.prezzo) AS prezzo_medio
    FROM categorie c LEFT JOIN prodotti p ON c.id = p.categoria_id
    GROUP BY c.id
  `, (err, categorie) => {
    if (err) { res.writeHead(500); res.end(JSON.stringify({ errore: err.message })); return; }

    // Query 2: totale ordini e fatturato
    db.query(`
      SELECT COUNT(*) AS totale_ordini, COALESCE(SUM(totale), 0) AS fatturato_totale
      FROM ordini
    `, (err2, riepilogo) => {
      if (err2) { res.writeHead(500); res.end(JSON.stringify({ errore: err2.message })); return; }

      // Query 3: ultimi 5 ordini
      db.query(`
        SELECT id, nome_cliente, email, totale, data_ordine
        FROM ordini
        ORDER BY data_ordine DESC
        LIMIT 5
      `, (err3, ordini_recenti) => {
        if (err3) { res.writeHead(500); res.end(JSON.stringify({ errore: err3.message })); return; }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          categorie,
          totale_ordini: riepilogo[0].totale_ordini,
          fatturato_totale: riepilogo[0].fatturato_totale,
          ordini_recenti
        }));
      });
    });
  });
  return;
}

// POST contatti
  if (req.method === 'POST' && urlPath === '/api/contatti') {
    const body = await parseBody(req);
    const { nome, email, oggetto, messaggio } = body;
    if (!nome || !email || !messaggio) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errore: 'Campi obbligatori mancanti' }));
      return;
    }
    db.query(
      'INSERT INTO messaggi (nome, email, oggetto, messaggio) VALUES (?, ?, ?, ?)',
      [nome.trim(), email.trim(), (oggetto || '').trim(), messaggio.trim()],
      (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ errore: err.message }));
          return;
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }
    );
    return;
  }

  // Serve file statici del frontend
  const staticBase = path.join(__dirname, '../frontend');
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  const fullPath = path.join(staticBase, filePath);

  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };

  const ext = path.extname(fullPath);
  serveStaticFile(res, fullPath, mimeTypes[ext] || 'text/plain');
});

server.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});