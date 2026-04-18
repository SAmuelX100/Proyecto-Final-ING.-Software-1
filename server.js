const express = require('express');
const { Client } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // Sirve HTML/CSS/JS

// TU CONEXIÓN
const con = new Client({
  host: "localhost",
  user: "postgres",
  port: 5433,
  password: "samuel1",
  database: "CooperativaDB"
});

con.connect().then(() => console.log("✅ DB conectada"))
  .catch(err => console.error("❌ Error DB:", err));

// ⭐️ CRUD GENÉRICO - FUNCIONA CON CUALQUIER TABLA
app.use('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    if (req.method === 'POST') {
      // INSERT genérico
      const columns = Object.keys(req.body).join(', ');
      const values = Object.values(req.body).map((_, i) => `$${i + 1}`).join(', ');
      const result = await con.query(`INSERT INTO "${tabla}" (${columns}) VALUES (${values}) RETURNING *`, Object.values(req.body));
      res.json(result.rows[0]);
    } else {
      // SELECT genérico
      const result = await con.query(`SELECT * FROM "${tabla}"`);
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    if (req.method === 'PUT') {
      const updates = Object.keys(req.body).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
      const values = [...Object.values(req.body), id];
      const result = await con.query(`UPDATE "${tabla}" SET ${updates} WHERE id_socio = $${values.length} RETURNING *`, values);
      res.json(result.rows[0] || { mensaje: 'Actualizado' });
    } else if (req.method === 'DELETE') {
      await con.query(`DELETE FROM "${tabla}" WHERE id_socio = $1`, [id]);
      res.json({ mensaje: 'Eliminado correctamente' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('🌐 http://localhost:3000'));