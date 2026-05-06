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

// ─── LÓGICA DE NEGOCIO AVANZADA ───────────────────────────────────────────────

// 1. Obtener las cuotas (amortización) de un préstamo específico
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

// 2. Generar tabla de cuotas automáticamente al aprobar préstamo
app.post('/api/Prestamo/:id/generar_cuotas', async (req, res) => {
  const { id } = req.params;
  try {
    const prestamoRes = await con.query(`SELECT * FROM "Prestamo" WHERE id_prestamo = $1`, [id]);
    if (prestamoRes.rows.length === 0) return res.json({ error: "Préstamo no encontrado" });
    const p = prestamoRes.rows[0];

    const countRes = await con.query(`SELECT COUNT(*) FROM "Cuota" WHERE id_prestamo = $1`, [id]);
    if (parseInt(countRes.rows[0].count) > 0) return res.json({ message: "Cuotas ya generadas" });

    const monto = parseFloat(p.monto);
    const tasaMensual = (parseFloat(p.tasa_interes) / 100) / 12;
    const plazo = parseInt(p.plazo_meses);

    let cuotaFija = tasaMensual === 0 ? monto / plazo : (monto * tasaMensual * Math.pow(1 + tasaMensual, plazo)) / (Math.pow(1 + tasaMensual, plazo) - 1);
    
    let saldo = monto;
    let fecha = new Date(p.fecha_aprobacion || new Date());

    for (let i = 1; i <= plazo; i++) {
        let interes = saldo * tasaMensual;
        let capital = cuotaFija - interes;
        if (i === plazo) { capital = saldo; cuotaFija = capital + interes; } 
        saldo -= capital;
        fecha.setMonth(fecha.getMonth() + 1); 

        await con.query(
            `INSERT INTO "Cuota" (id_prestamo, numero_cuota, montol_capital, monto_interes, monto_total, fecha_vencimiento, estado)
             VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')`,
            [id, i, capital, interes, cuotaFija, fecha.toISOString().split('T')[0]]
        );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Interceptar Validación de Aportaciones (Opcional si decides mantenerlo)
app.put('/api/Aportacion/:id/validar', async (req, res) => {
  const { id } = req.params;
  const { validado_por } = req.body;
  try {
    await con.query(`UPDATE "Aportacion" SET estado = 'validada', validado_por = $1 WHERE id_aportacion = $2`, [validado_por, id]);

    const apRes = await con.query(`SELECT * FROM "Aportacion" WHERE id_aportacion = $1`, [id]);
    const ap = apRes.rows[0];

    if (ap.tipo === 'abono_prestamo') {
        const prestamoRes = await con.query(`SELECT id_prestamo FROM "Prestamo" WHERE id_socio = $1 AND estado IN ('aprobado', 'desembolsado') ORDER BY id_prestamo ASC LIMIT 1`, [ap.id_socio]);
        if (prestamoRes.rows.length > 0) {
            const idPrestamo = prestamoRes.rows[0].id_prestamo;
            const cuotaRes = await con.query(`SELECT id_cuota FROM "Cuota" WHERE id_prestamo = $1 AND estado = 'pendiente' ORDER BY numero_cuota ASC LIMIT 1`, [idPrestamo]);
            if (cuotaRes.rows.length > 0) {
                await con.query(`UPDATE "Cuota" SET estado = 'pagada' WHERE id_cuota = $1`, [cuotaRes.rows[0].id_cuota]);
            }
        }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🔥 4. Registrar un Pago y actualizar la Cuota automáticamente
app.post('/api/Pago', async (req, res) => {
  try {
    const data = toSnakeCase(req.body);
    
    // 1. Insertar el recibo de pago en la tabla Pago
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
    const result = await con.query(
        `INSERT INTO "Pago" (${columns}) VALUES (${placeholders}) RETURNING *`, 
        Object.values(data)
    );

    // 2. Lógica de negocio: Marcar la cuota como pagada
    if (data.id_cuota) {
        await con.query(`UPDATE "Cuota" SET estado = 'pagada' WHERE id_cuota = $1`, [data.id_cuota]);
    }

    res.json(result.rows[0]);
  } catch (e) {
    console.error('Error procesando pago:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── API REST GENÉRICA (CRUD DINÁMICO) ───────────────────────────────────────

app.get('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    let extraQuery = "";
    // Permitimos filtrar pagos por prestamoId enviando ?prestamoId=1
    if (tabla === 'Pago' && req.query.prestamoId) {
      extraQuery = ` WHERE id_prestamo = ${parseInt(req.query.prestamoId)}`;
    }
    const result = await con.query(`SELECT * FROM "${tabla}"${extraQuery}`);
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

app.listen(3000, () => console.log('🌐 Servidor en http://localhost:3000'));