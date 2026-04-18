const express = require('express');
const { Client } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const con = new Client({
  host: "localhost", user: "postgres", port: 5433, 
  password: "samuel1", database: "CooperativaDB"
});
con.connect().then(() => console.log("✅ DB OK"));

// 🔧 FUNCIÓN snake_case helper
function toSnakeCase(obj) {
  const snake = {};
  for (let [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    snake[snakeKey] = value;
  }
  return snake;
}

// ⭐️ GET/POST - Cualquier tabla
app.use('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    if (req.method === 'POST') {
      const data = toSnakeCase(req.body);
      console.log('INSERT →', tabla, data);
      
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
      const result = await con.query(
        `INSERT INTO "${tabla}" (${columns}) VALUES (${placeholders}) RETURNING *`, 
        Object.values(data)
      );
      res.json(result.rows[0]);
    } else {
      const result = await con.query(`SELECT * FROM "${tabla}"`);
      res.json(result.rows);
    }
  } catch (error) {
    console.error('POST/GET Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ⭐️ PUT/DELETE - Cualquier tabla/:id
app.use('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    if (req.method === 'PUT') {
      const data = toSnakeCase(req.body);
      console.log('UPDATE →', tabla, id, data);
      
      const updates = Object.keys(data).map((k, i) => `"${k}" = $${i+1}`).join(', ');
      const values = [...Object.values(data), id];
      const result = await con.query(
        `UPDATE "${tabla}" SET ${updates} WHERE id_socio = $${values.length} RETURNING *`, 
        values
      );
      res.json(result.rows[0] || { ok: true });
    } else if (req.method === 'DELETE') {
      console.log('DELETE →', tabla, id);
      await con.query(`DELETE FROM "${tabla}" WHERE id_socio = $1`, [id]);
      res.json({ ok: true });
    }
  } catch (error) {
    console.error('PUT/DELETE Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('🌐 http://localhost:3000'));