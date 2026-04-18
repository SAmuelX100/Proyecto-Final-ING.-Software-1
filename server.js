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

// ⭐️ GET/POST para CUALQUIER TABLA
app.use('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    if (req.method === 'POST') {
      const data = toSnakeCase(req.body);
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
      const result = await con.query(`INSERT INTO "${tabla}" (${columns}) VALUES (${placeholders}) RETURNING *`, Object.values(data));
      res.json(result.rows[0]);
    } else if (req.method === 'GET') {
      // ✅ GET individual por query param O lista completa
      const { id } = req.query;
      if (id) {
        // Para Socio usamos id_socio, para otros id_usuario
        const pk = tabla === 'Socio' ? 'id_socio' : 'id_usuario';
        const result = await con.query(`SELECT * FROM "${tabla}" WHERE "${pk}" = $1`, [id]);
        res.json(result.rows[0] || null);
      } else {
        const result = await con.query(`SELECT * FROM "${tabla}" ORDER BY "id_socio" DESC NULLS LAST`);
        res.json(result.rows);
      }
    }
  } catch (e) {
    console.error('GET/POST Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ⭐️ PUT/DELETE ESPECÍFICO PARA SOCIO (SIMPLIFICADO Y FUNCIONAL)
app.use('/api/Socio/:id', async (req, res) => {
  const { id } = req.params;
  const { tabla } = req.params;
  
  try {
    if (req.method === 'PUT') {
      const data = toSnakeCase(req.body);
      
      // ✅ HARDCODE para Socio (más confiable)
      const setClause = Object.keys(data)
        .map((key, i) => `"${key}" = $${i + 1}`)
        .join(', ');
      
      const values = [...Object.values(data), id];
      const query = `UPDATE "Socio" SET ${setClause} WHERE "id_socio" = $${values.length} RETURNING *`;
      
      const result = await con.query(query, values);
      res.json(result.rows[0]);
      
    } else if (req.method === 'DELETE') {
      // ✅ DELETE simple y directo para Socio
      const result = await con.query('DELETE FROM "Socio" WHERE "id_socio" = $1 RETURNING *', [id]);
      res.json({ ok: true, deleted: result.rowCount > 0 });
    }
  } catch (e) {
    console.error('Socio PUT/DELETE Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('🌐 http://localhost:3000'));