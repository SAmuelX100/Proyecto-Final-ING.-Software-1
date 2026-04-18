const express = require('express');
const { Client } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const con = new Client({
  host: "localhost", 
  user: "postgres", 
  port: 5433, 
  password: "samuel1", 
  database: "CooperativaDB"
});
con.connect().then(() => console.log("✅ DB OK"));

// Helper: Convierte camelCase del frontend a snake_case para PostgreSQL
function toSnakeCase(obj) {
  const snake = {};
  for (let [key, value] of Object.entries(obj)) {
    snake[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = value;
  }
  return snake;
}

// ─── API REST GENÉRICA (VÁLIDA PARA CUALQUIER TABLA) ──────────────────────────

// GET: Obtener todos los registros
app.get('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    const result = await con.query(`SELECT * FROM "${tabla}"`);
    res.json(result.rows);
  } catch (e) {
    console.error('GET Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST: Crear nuevo registro
app.post('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    const data = toSnakeCase(req.body);
    console.log(`[POST] /api/${tabla} ->`, data);
    
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
    const values = Object.values(data);
    
    const result = await con.query(`INSERT INTO "${tabla}" (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (e) {
    console.error('POST Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT: Actualizar registro existente
app.put('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    const data = toSnakeCase(req.body);
    console.log(`[PUT] /api/${tabla}/${id} ->`, data);
    
    // 🔥 MAGIA: Detectar la llave primaria automáticamente (ej: id_socio, id_prestamo)
    const pk = `id_${tabla.toLowerCase()}`; 
    
    const updates = Object.keys(data).map((k, i) => `"${k}"=$${i+1}`).join(', ');
    const values = [...Object.values(data), id];
    
    const result = await con.query(`UPDATE "${tabla}" SET ${updates} WHERE "${pk}" = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (e) {
    console.error('PUT Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE: Eliminar registro
app.delete('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    console.log(`[DELETE] /api/${tabla}/${id}`);
    
    // 🔥 MAGIA: Identificar llave primaria automáticamente
    const pk = `id_${tabla.toLowerCase()}`; 
    
    await con.query(`DELETE FROM "${tabla}" WHERE "${pk}" = $1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('🌐 Servidor corriendo en http://localhost:3000'));