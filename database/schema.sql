CREATE DATABASE IF NOT EXISTS hynex_shop;
USE hynex_shop;

CREATE TABLE categorie (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL
);

CREATE TABLE prodotti (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,
  prezzo DECIMAL(10,2) NOT NULL,
  immagine_url VARCHAR(500),
  categoria_id INT,
  disponibile BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (categoria_id) REFERENCES categorie(id)
);

CREATE TABLE varianti (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prodotto_id INT,
  taglia VARCHAR(10),
  colore VARCHAR(50),
  quantita_stock INT DEFAULT 0,
  FOREIGN KEY (prodotto_id) REFERENCES prodotti(id)
);

CREATE TABLE ordini (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_cliente VARCHAR(255),
  email VARCHAR(255),
  indirizzo TEXT,
  totale DECIMAL(10,2),
  data_ordine DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ordini_prodotti (
  ordine_id INT,
  prodotto_id INT,
  quantita INT,
  prezzo_unitario DECIMAL(10,2),
  FOREIGN KEY (ordine_id) REFERENCES ordini(id),
  FOREIGN KEY (prodotto_id) REFERENCES prodotti(id)
);

-- Dati di esempio
INSERT INTO categorie (nome) VALUES ('Maglie'), ('Pantaloni'), ('Scarpe'), ('Accessori');

INSERT INTO prodotti (nome, descrizione, prezzo, immagine_url, categoria_id) VALUES
('Maglia Essential', 'T-shirt in cotone 100% biologico, vestibilità relaxed', 29.90, 'img/maglia1.jpg', 1),
('Maglia Oversize Logo', 'Oversize con stampa logo frontale, unisex', 39.90, 'img/maglia2.jpg', 1),
('Pantalone Cargo', 'Cargo fit con tasche laterali, tessuto tecnico', 69.90, 'img/pantalone1.jpg', 2),
('Pantalone Slim Chino', 'Chino slim in cotone stretch, versatile', 59.90, 'img/pantalone2.jpg', 2),
('Sneaker Low White', 'Sneaker bassa in pelle vegana, suola in gomma', 89.90, 'img/scarpa1.jpg', 3),
('Cappellino Dad Hat', 'Cappellino non strutturato con ricamo logo', 24.90, 'img/accessorio1.jpg', 4);

INSERT INTO varianti (prodotto_id, taglia, colore, quantita_stock) VALUES
(1, 'S', 'Bianco', 10), (1, 'M', 'Bianco', 15), (1, 'L', 'Bianco', 8),
(1, 'S', 'Nero', 12), (1, 'M', 'Nero', 10), (1, 'L', 'Nero', 5),
(2, 'M', 'Grigio', 7), (2, 'L', 'Grigio', 9), (2, 'XL', 'Grigio', 4),
(3, 'M', 'Verde militare', 6), (3, 'L', 'Verde militare', 8),
(4, 'S', 'Beige', 10), (4, 'M', 'Beige', 12), (4, 'L', 'Beige', 7),
(5, '41', 'Bianco', 5), (5, '42', 'Bianco', 8), (5, '43', 'Bianco', 6),
(6, 'Unica', 'Nero', 20), (6, 'Unica', 'Beige', 15);