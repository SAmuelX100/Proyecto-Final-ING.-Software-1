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

// Helper: Convierte camelCase a snake_case
function toSnakeCase(obj) {
  const snake = {};
  for (let [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      snake[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = value;
    }
  }
  return snake;
}

// ─── LÓGICA DE NEGOCIO AVANZADA: REPORTES ─────────────────────────────────────

// 1. Obtener estadísticas (Para las tarjetas de arriba)
app.get('/api/Reporte/estadisticas', async (req, res) => {
  try {
    const total = await con.query(`SELECT COUNT(*) FROM "Reporte"`);
    const pdf = await con.query(`SELECT COUNT(*) FROM "Reporte" WHERE formato = 'pdf'`);
    const excel = await con.query(`SELECT COUNT(*) FROM "Reporte" WHERE formato = 'excel'`);
    
    res.json({
      generados: parseInt(total.rows[0].count),
      pdf: parseInt(pdf.rows[0].count),
      excel: parseInt(excel.rows[0].count)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Obtener datos reales del reporte (filtro por fechas) o consultar la tabla Reporte
app.get('/api/Reporte', async (req, res) => {
  const { tipo, inicio, fin } = req.query;
  
  // Si no hay query 'tipo', actúa como CRUD genérico (devuelve el historial de reportes)
  if (!tipo) {
    try {
      const result = await con.query(`SELECT * FROM "Reporte" ORDER BY fecha_generacion DESC`);
      return res.json(result.rows);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // Si hay query 'tipo', consultamos la tabla correspondiente para llenar la vista previa
  try {
    let result = { rows: [] };
    if (tipo === 'socios') {
      result = await con.query(`SELECT id_socio, nombre || ' ' || apellido AS nombre_completo, dni, email, fecha_ingreso, estado FROM "Socio" WHERE fecha_ingreso BETWEEN $1 AND $2`, [inicio, fin]);
    } else if (tipo === 'prestamos') {
      result = await con.query(`SELECT id_prestamo, id_socio, monto, plazo_meses, tasa_interes, estado, monto AS saldo_pendiente FROM "Prestamo" WHERE fecha_solicitud BETWEEN $1 AND $2`, [inicio, fin]);
    } else if (tipo === 'aportaciones') {
      result = await con.query(`SELECT id_aportacion, id_socio, monto, fecha, tipo, estado FROM "Aportacion" WHERE fecha BETWEEN $1 AND $2`, [inicio, fin]);
    }
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Registrar un nuevo Reporte en BD
app.post('/api/Reporte', async (req, res) => {
  const { tipo, fechaInicio, fechaFin, formato, generadoPor } = req.body;
  try {
    // Inserta y devuelve el ID generado por la secuencia
    const result = await con.query(
      `INSERT INTO "Reporte" (tipo, fecha_inicio, fecha_fin, formato, generado_por, fecha_generacion) 
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [tipo, fechaInicio, fechaFin, formato, generadoPor || 1]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error("Error guardando reporte:", e.message);
    res.status(500).json({ error: e.message });
  }
});


// ─── LÓGICA DE NEGOCIO AVANZADA: AHORROS ──────────────────────────────────────
app.get('/api/Cuenta_ahorro/:id/movimientos', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await con.query(`SELECT * FROM "Movimiento_ahorro" WHERE id_cuenta = $1 ORDER BY fecha DESC`, [id]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/Cuenta_ahorro/:id/deposito', async (req, res) => {
  const { id } = req.params;
  const { monto, descripcion } = req.body;
  try {
    const cuentaRes = await con.query(`SELECT saldo FROM "Cuenta_ahorro" WHERE id_cuenta = $1`, [id]);
    if (cuentaRes.rows.length === 0) return res.status(404).json({ error: "Cuenta no encontrada" });
    
    const saldoAnterior = parseFloat(cuentaRes.rows[0].saldo);
    const montoNum = parseFloat(monto);
    const saldoPosterior = saldoAnterior + montoNum;

    await con.query(
      `INSERT INTO "Movimiento_ahorro" (id_cuenta, tipo, monto, fecha, saldo_anterior, saldo_posterior, referencia) 
       VALUES ($1, 'deposito', $2::numeric, NOW(), $3::numeric, $4::numeric, $5)`,
      [id, montoNum, saldoAnterior, saldoPosterior, descripcion || 'Depósito en caja']
    );
    res.json({ ok: true, saldo: saldoPosterior });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/Cuenta_ahorro/:id/retiro', async (req, res) => {
  const { id } = req.params;
  const { monto, descripcion } = req.body;
  try {
    const cuentaRes = await con.query(`SELECT saldo FROM "Cuenta_ahorro" WHERE id_cuenta = $1`, [id]);
    if (cuentaRes.rows.length === 0) return res.status(404).json({ error: "Cuenta no encontrada" });
    
    const saldoAnterior = parseFloat(cuentaRes.rows[0].saldo);
    const montoNum = parseFloat(monto);

    if (saldoAnterior < montoNum) return res.status(400).json({ error: "Fondos insuficientes." });

    const saldoPosterior = saldoAnterior - montoNum;

    await con.query(
      `INSERT INTO "Movimiento_ahorro" (id_cuenta, tipo, monto, fecha, saldo_anterior, saldo_posterior, referencia) 
       VALUES ($1, 'retiro', $2::numeric, NOW(), $3::numeric, $4::numeric, $5)`,
      [id, montoNum, saldoAnterior, saldoPosterior, descripcion || 'Retiro en caja']
    );
    res.json({ ok: true, saldo: saldoPosterior });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ─── LÓGICA DE NEGOCIO AVANZADA: PRÉSTAMOS Y PAGOS ────────────────────────────
app.get('/api/Prestamo/:id/evaluar', async (req, res) => {
  const { id } = req.params;
  try {
    const prestamoRes = await con.query(`SELECT * FROM "Prestamo" WHERE id_prestamo = $1`, [id]);
    if (prestamoRes.rows.length === 0) return res.status(404).json({ error: "Préstamo no encontrado" });

    const p = prestamoRes.rows[0];
    const monto = parseFloat(p.monto);
    const tasa = parseFloat(p.tasa_interes);
    const plazo = parseInt(p.plazo_meses);

    const tasaMensual = (tasa / 100) / 12;
    let cuota = tasaMensual === 0 ? monto / plazo : (monto * tasaMensual * Math.pow(1 + tasaMensual, plazo)) / (Math.pow(1 + tasaMensual, plazo) - 1);

    let puntos = 100; 
    const observaciones = ["Socio verificado."];

    if (monto > 100000) { puntos -= 20; observaciones.push("Monto elevado. Requiere aprobación del comité."); } 
    else if (monto > 50000) { puntos -= 10; observaciones.push("Monto moderado-alto."); }
    if (plazo > 24) { puntos -= 15; observaciones.push("Plazo extendido."); }

    let recomendacion = puntos < 70 ? "RECHAZAR" : puntos <= 85 ? "REVISAR" : "APROBAR";

    res.json({ monto, tasa, plazo, cuotaMensual: cuota, puntos, recomendacion, observaciones });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/Prestamo/:id/amortizacion', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await con.query(`SELECT * FROM "Cuota" WHERE id_prestamo = $1 ORDER BY numero_cuota ASC`, [id]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/Pago', async (req, res) => {
  try {
    const data = toSnakeCase(req.body);
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
    const result = await con.query(`INSERT INTO "Pago" (${columns}) VALUES (${placeholders}) RETURNING *`, Object.values(data));

    if (data.id_cuota) {
        await con.query(`UPDATE "Cuota" SET estado = 'pagada' WHERE id_cuota = $1`, [data.id_cuota]);
    }
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API REST GENÉRICA (CRUD DINÁMICO) ───────────────────────────────────────
app.get('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    let extraQuery = "";
    if (tabla === 'Pago' && req.query.prestamoId) extraQuery = ` WHERE id_prestamo = ${parseInt(req.query.prestamoId)}`;
    const result = await con.query(`SELECT * FROM "${tabla}"${extraQuery}`);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/:tabla', async (req, res) => {
  const { tabla } = req.params;
  try {
    const data = toSnakeCase(req.body);
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i+1}`).join(', ');
    const result = await con.query(`INSERT INTO "${tabla}" (${columns}) VALUES (${placeholders}) RETURNING *`, Object.values(data));
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/:tabla/:id', async (req, res) => {
  const { tabla, id } = req.params;
  try {
    const pk = `id_${tabla.toLowerCase()}`; 
    await con.query(`DELETE FROM "${tabla}" WHERE "${pk}" = $1`, [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(3000, () => console.log('🌐 Servidor en http://localhost:3000'));