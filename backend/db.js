const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root1899!CS',
  database: 'hynex_shop'
});

connection.connect((err) => {
  if (err) {
    console.error('Errore connessione al database:', err.message);
    return;
  }
  console.log('Connesso al database MySQL');
});

module.exports = connection;