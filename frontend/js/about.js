/* === ABOUT — Form Contatti === */

async function sendContactForm() {
  const nome     = document.getElementById('cNome').value.trim();
  const cognome  = document.getElementById('cCognome').value.trim();
  const email    = document.getElementById('cEmail').value.trim();
  const oggetto  = document.getElementById('cOggetto').value.trim();
  const messaggio = document.getElementById('cMessaggio').value.trim();

  // Validazione
  if (!nome || !email || !messaggio) {
    showToast('Compila almeno nome, email e messaggio.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Inserisci un\'email valida.');
    return;
  }

  // Stato loading
  const btn = document.querySelector('.btn-send');
  btn.disabled = true;
  btn.textContent = 'INVIO...';

  try {
    const res = await fetch('/api/contatti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: cognome ? `${nome} ${cognome}` : nome,
        email,
        oggetto,
        messaggio
      })
    });

    if (!res.ok) throw new Error('Errore server');

    // Successo: mostra conferma
    document.getElementById('contactForm').style.display = 'none';
    document.getElementById('formConfirm').style.display = 'block';

  } catch {
    showToast('Errore di connessione. Riprova più tardi.');
    btn.disabled = false;
    btn.textContent = 'INVIA MESSAGGIO';
  }
}