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

// Helper snake_case
function toSnakeCase(obj) {
  const snake = {};
  for (let [key, value] of Object.entries(obj)) {
    snake[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = value;
  }
  return snake;
}

// GET/POST cualquier tabla
app.use('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    if (req.method === 'POST') {
      const data = toSnakeCase(req.body);
      console.log('POST', tabla, data);
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
      const result = await con.query(`INSERT INTO "${tabla}" (${columns}) VALUES (${placeholders}) RETURNING *`, Object.values(data));
      res.json(result.rows[0]);
    } else {
      const result = await con.query(`SELECT * FROM "${tabla}"`);
      res.json(result.rows);
    }
  } catch (e) {
    console.error('GET/POST Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ⭐️ PUT/DELETE CORREGIDO (usa id_socio O id_usuario)
app.use('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    if (req.method === 'PUT') {
      const data = toSnakeCase(req.body);
      console.log('PUT', tabla, id, data);
      
      // Detectar primary key
      const pk = tabla === 'Socio' ? 'id_socio' : 'id_usuario';
      const updates = Object.keys(data).map((k, i) => `"${k}"=$${i+1}`).join(', ');
      const values = [...Object.values(data), id];
      
      const result = await con.query(`UPDATE "${tabla}" SET ${updates} WHERE "${pk}" = $${values.length} RETURNING *`, values);
      res.json(result.rows[0]);
    } else if (req.method === 'DELETE') {
      console.log('DELETE', tabla, id);
      const pk = tabla === 'Socio' ? 'id_socio' : 'id_usuario';
      await con.query(`DELETE FROM "${tabla}" WHERE "${pk}" = $1`, [id]);
      res.json({ ok: true });
    }
  } catch (e) {
    console.error('PUT/DELETE Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('🌐 http://localhost:3000'));