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
    if (value !== undefined) {
      snake[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = value;
    }
  }
  return snake;
}

// ─── ENDPOINTS ESPECÍFICOS DE PRÉSTAMOS ───────────────────────────────────────

// GET: Obtener las cuotas (amortización) de un préstamo específico
app.get('/api/Prestamo/:id/amortizacion', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await con.query(
      `SELECT * FROM "Cuota" WHERE id_prestamo = $1 ORDER BY numero_cuota ASC`, 
      [id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Error cargando cuotas:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── API REST GENÉRICA ───────────────────────────────────────────────────────

app.get('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    const result = await con.query(`SELECT * FROM "${tabla}"`);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    const data = toSnakeCase(req.body);
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
    const result = await con.query(`INSERT INTO "${tabla}" (${columns}) VALUES (${placeholders}) RETURNING *`, Object.values(data));
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    const data = toSnakeCase(req.body);
    // Identificación dinámica de la Primary Key
    const pk = `id_${tabla.toLowerCase()}`; 
    const updates = Object.keys(data).map((k, i) => `"${k}"=$${i+1}`).join(', ');
    const values = [...Object.values(data), id];
    const result = await con.query(`UPDATE "${tabla}" SET ${updates} WHERE "${pk}" = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    const pk = `id_${tabla.toLowerCase()}`; 
    await con.query(`DELETE FROM "${tabla}" WHERE "${pk}" = $1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('🌐 Servidor corriendo en http://localhost:3000'));