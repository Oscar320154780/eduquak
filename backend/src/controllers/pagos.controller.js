const { runQuery, getQuery, allQuery } = require("../utils/dbHelpers");

function baseFrontend() {
  return process.env.FRONTEND_URL || process.env.BACKEND_URL || "http://localhost:3000";
}

function baseBackend() {
  return process.env.BACKEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";
}

function accessTokenPlataforma() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || "";
}

function precioBase() {
  return Number(process.env.PRECIO_BASE_ASESORIA || process.env.PRECIO_MINIMO_ASESORIA || 100);
}

function modoMarketplaceActivo() {
  return String(process.env.MERCADOPAGO_MODO_MARKETPLACE || process.env.PAGOS_REQUIERE_MP_ASESOR || "true") === "true";
}

function retornoConfiableSinWebhook() {
  return process.env.PAGOS_CONFIAR_RETORNO === "true" || process.env.NODE_ENV !== "production";
}

function usarSandboxMercadoPago() {
  const valor = String(process.env.MERCADOPAGO_USAR_SANDBOX || "").toLowerCase();

  if (["true", "1", "si", "sí", "yes"].includes(valor)) {
    return true;
  }

  if (["false", "0", "no"].includes(valor)) {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function obtenerUrlPago(preference) {
  if (usarSandboxMercadoPago()) {
    return preference.sandbox_init_point || preference.init_point || null;
  }

  return preference.init_point || preference.sandbox_init_point || null;
}

function calcularComision(monto) {
  const porcentaje = Number(process.env.COMISION_EDUQUAK || 0.15);
  return Number((Number(monto) * porcentaje).toFixed(2));
}

function normalizarEstadoMp(estado) {
  const value = String(estado || "pending").toLowerCase();

  if (["approved", "accredited", "success"].includes(value)) {
    return "aprobado";
  }

  if (["rejected", "cancelled", "canceled", "failure", "refunded", "charged_back"].includes(value)) {
    return "rechazado";
  }

  return "pendiente";
}

async function mercadoPago(path, options = {}, accessToken = null) {
  const token = accessToken || accessTokenPlataforma();

  if (!token) {
    const error = new Error("Falta access token de Mercado Pago");
    error.status = 500;
    throw error;
  }

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || "Mercado Pago rechazó la solicitud");
    error.status = response.status;
    error.cause = data;
    throw error;
  }

  return data;
}

async function cuentaPagoAsesor(idAsesor) {
  if (!idAsesor) return null;

  return getQuery(
    `SELECT *
     FROM cuentas_pago_asesor
     WHERE id_usuario = $1
       AND estado = 'conectada'
     LIMIT 1`,
    [idAsesor]
  );
}

async function obtenerCredencialVendedor(idAsesor) {
  const cuenta = await cuentaPagoAsesor(idAsesor);

  if (cuenta?.access_token) {
    return {
      accessToken: cuenta.access_token,
      mpUserId: cuenta.mp_user_id,
      modo: "marketplace",
      cuenta
    };
  }

  if (modoMarketplaceActivo()) {
    const error = new Error("El asesor debe conectar su cuenta de Mercado Pago antes de recibir pagos");
    error.status = 409;
    throw error;
  }

  if (!accessTokenPlataforma()) {
    const error = new Error("Falta MERCADOPAGO_ACCESS_TOKEN en el entorno");
    error.status = 500;
    throw error;
  }

  return {
    accessToken: accessTokenPlataforma(),
    mpUserId: null,
    modo: "plataforma",
    cuenta: null
  };
}

async function buscarPagoPorPayment(paymentData = {}) {
  const metadata = paymentData.metadata || {};
  const idPago = metadata.id_pago || metadata.idPago || null;

  if (idPago) {
    return getQuery(`SELECT * FROM pagos_asesoria WHERE id_pago = $1`, [idPago]);
  }

  const externalReference = paymentData.external_reference || "";
  const match = String(externalReference).match(/eduquak_pago_(\d+)/);

  if (match) {
    return getQuery(`SELECT * FROM pagos_asesoria WHERE id_pago = $1`, [match[1]]);
  }

  if (paymentData.preference_id) {
    return getQuery(`SELECT * FROM pagos_asesoria WHERE preference_id = $1`, [paymentData.preference_id]);
  }

  if (paymentData.order?.id) {
    return getQuery(`SELECT * FROM pagos_asesoria WHERE merchant_order_id = $1`, [String(paymentData.order.id)]);
  }

  return null;
}

async function obtenerPaymentConTokens(paymentId) {
  const errores = [];

  if (accessTokenPlataforma()) {
    try {
      const data = await mercadoPago(`/v1/payments/${paymentId}`, { method: "GET" }, accessTokenPlataforma());
      return { data, tokenTipo: "plataforma" };
    } catch (error) {
      errores.push(error.message);
    }
  }

  const cuentas = await allQuery(
    `SELECT id_usuario, mp_user_id, access_token
     FROM cuentas_pago_asesor
     WHERE estado = 'conectada'
       AND access_token IS NOT NULL`
  );

  for (const cuenta of cuentas) {
    try {
      const data = await mercadoPago(`/v1/payments/${paymentId}`, { method: "GET" }, cuenta.access_token);
      return { data, tokenTipo: "asesor", cuenta };
    } catch (error) {
      errores.push(error.message);
    }
  }

  const error = new Error(`No se pudo consultar el pago ${paymentId} con los tokens disponibles`);
  error.status = 404;
  error.cause = errores;
  throw error;
}

async function obtenerMerchantOrderConTokens(orderId) {
  const errores = [];

  if (accessTokenPlataforma()) {
    try {
      const data = await mercadoPago(`/merchant_orders/${orderId}`, { method: "GET" }, accessTokenPlataforma());
      return { data, tokenTipo: "plataforma" };
    } catch (error) {
      errores.push(error.message);
    }
  }

  const cuentas = await allQuery(
    `SELECT id_usuario, mp_user_id, access_token
     FROM cuentas_pago_asesor
     WHERE estado = 'conectada'
       AND access_token IS NOT NULL`
  );

  for (const cuenta of cuentas) {
    try {
      const data = await mercadoPago(`/merchant_orders/${orderId}`, { method: "GET" }, cuenta.access_token);
      return { data, tokenTipo: "asesor", cuenta };
    } catch (error) {
      errores.push(error.message);
    }
  }

  const error = new Error(`No se pudo consultar la orden ${orderId} con los tokens disponibles`);
  error.status = 404;
  error.cause = errores;
  throw error;
}

async function crearPagoPendiente({ idAlumno, asesoria, tipo, monto }) {
  const total = Number(monto || asesoria.precio || precioBase());
  const comision = calcularComision(total);
  const asesor = Number((total - comision).toFixed(2));

  const existentePendiente = asesoria.id_asesoria
    ? await getQuery(
        `SELECT *
         FROM pagos_asesoria
         WHERE id_asesoria = $1
           AND id_alumno = $2
           AND estado = 'pendiente'
         ORDER BY id_pago DESC
         LIMIT 1`,
        [asesoria.id_asesoria, idAlumno]
      )
    : null;

  if (existentePendiente) {
    return existentePendiente;
  }

  const result = await runQuery(
    `INSERT INTO pagos_asesoria (
       id_asesoria,
       id_alumno,
       id_asesor,
       tipo,
       monto_total,
       comision_eduquak,
       monto_asesor,
       marketplace_fee,
       estado
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $6, 'pendiente')
     RETURNING *`,
    [asesoria.id_asesoria || null, idAlumno, asesoria.id_asesor, tipo, total, comision, asesor]
  );

  return result.rows[0];
}

async function guardarLinksPago(idPago, preference, credencial) {
  await runQuery(
    `UPDATE pagos_asesoria
     SET preference_id = $1,
         init_point = $2,
         sandbox_init_point = $3,
         modo_pago = $4,
         vendedor_mp_user_id = $5
     WHERE id_pago = $6`,
    [
      preference.id,
      preference.init_point,
      preference.sandbox_init_point,
      credencial?.modo || "plataforma",
      credencial?.mpUserId || null,
      idPago
    ]
  );
}

async function crearPreferencia({ idPago, titulo, monto, idAsesoria, tipo, idAsesor }) {
  const frontend = baseFrontend();
  const backend = baseBackend();
  const pago = await getQuery(`SELECT * FROM pagos_asesoria WHERE id_pago = $1`, [idPago]);
  const credencial = await obtenerCredencialVendedor(idAsesor || pago?.id_asesor);
  const externalReference = `eduquak_pago_${idPago}`;
  const comision = Number(pago?.comision_eduquak || calcularComision(monto));

  const body = {
    items: [
      {
        title: titulo,
        quantity: 1,
        currency_id: "MXN",
        unit_price: Number(monto)
      }
    ],
    external_reference: externalReference,
    metadata: {
      id_pago: Number(idPago),
      id_asesoria: idAsesoria ? Number(idAsesoria) : null,
      id_asesor: idAsesor ? Number(idAsesor) : null,
      tipo,
      modo_pago: credencial.modo
    },
    back_urls: {
      success: `${frontend}/pages/pago_resultado.html?resultado=success&id_pago=${idPago}`,
      failure: `${frontend}/pages/pago_resultado.html?resultado=failure&id_pago=${idPago}`,
      pending: `${frontend}/pages/pago_resultado.html?resultado=pending&id_pago=${idPago}`
    },
    auto_return: "approved",
    binary_mode: false,
    statement_descriptor: "EDUQUAK"
  };

  if (credencial.modo === "marketplace") {
    body.marketplace_fee = comision;
  }

  if (/^https:\/\//i.test(backend)) {
    body.notification_url = `${backend}/api/pagos/webhook`;
  }

  const preference = await mercadoPago("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body)
  }, credencial.accessToken);

  await guardarLinksPago(idPago, preference, credencial);

  return preference;
}

async function marcarPagoAprobado(pago, paymentData = {}) {
  const paymentId = paymentData.id || paymentData.payment_id || pago.payment_id || `retorno_${pago.id_pago}`;
  const estadoMp = paymentData.status || "approved";
  const orderId = paymentData.order?.id || paymentData.order_id || null;

  await runQuery(
    `UPDATE pagos_asesoria
     SET estado = 'aprobado',
         estado_mp = $1,
         payment_id = COALESCE($2, payment_id),
         merchant_order_id = COALESCE($3, merchant_order_id),
         fecha_aprobacion = (NOW() AT TIME ZONE 'America/Mexico_City'),
         respuesta_mp = COALESCE($4, respuesta_mp)
     WHERE id_pago = $5`,
    [estadoMp, String(paymentId), orderId ? String(orderId) : null, JSON.stringify(paymentData || {}), pago.id_pago]
  );

  if (pago.id_asesoria) {
    await runQuery(
      `UPDATE asesorias
       SET estado_pago = 'pagado',
           monto_total = $1,
           comision_eduquak = $2,
           monto_asesor = $3,
           payment_id = COALESCE($4, payment_id),
           fecha_pago = (NOW() AT TIME ZONE 'America/Mexico_City')
       WHERE id_asesoria = $5`,
      [pago.monto_total, pago.comision_eduquak, pago.monto_asesor, String(paymentId), pago.id_asesoria]
    );
  }

  const asesoria = pago.id_asesoria
    ? await getQuery(`SELECT tipo FROM asesorias WHERE id_asesoria = $1`, [pago.id_asesoria])
    : null;

  if (asesoria?.tipo === "grupal") {
    const existente = await getQuery(
      `SELECT id_inscripcion
       FROM inscripciones_asesoria
       WHERE id_asesoria = $1 AND id_alumno = $2
       ORDER BY id_inscripcion DESC
       LIMIT 1`,
      [pago.id_asesoria, pago.id_alumno]
    );

    if (existente) {
      await runQuery(
        `UPDATE inscripciones_asesoria
         SET estado = 'inscrito', fecha_inscripcion = (NOW() AT TIME ZONE 'America/Mexico_City')
         WHERE id_inscripcion = $1`,
        [existente.id_inscripcion]
      );
    } else {
      await runQuery(
        `INSERT INTO inscripciones_asesoria (id_asesoria, id_alumno, estado, fecha_inscripcion)
         VALUES ($1, $2, 'inscrito', (NOW() AT TIME ZONE 'America/Mexico_City'))`,
        [pago.id_asesoria, pago.id_alumno]
      );
    }
  }
}

async function actualizarPagoNoAprobado(pago, estado, paymentId = null, respuesta = null) {
  const estadoInterno = normalizarEstadoMp(estado);

  await runQuery(
    `UPDATE pagos_asesoria
     SET estado = $1,
         estado_mp = $2,
         payment_id = COALESCE($3, payment_id),
         respuesta_mp = COALESCE($4, respuesta_mp)
     WHERE id_pago = $5`,
    [estadoInterno, estado, paymentId ? String(paymentId) : null, respuesta ? JSON.stringify(respuesta) : null, pago.id_pago]
  );
}

async function procesarPaymentId(paymentId) {
  const { data: paymentData } = await obtenerPaymentConTokens(paymentId);
  const pago = await buscarPagoPorPayment(paymentData);

  if (!pago) {
    return { ok: false, encontrado: false, paymentData };
  }

  if (paymentData.status === "approved") {
    await marcarPagoAprobado(pago, paymentData);
  } else {
    await actualizarPagoNoAprobado(pago, paymentData.status || "pending", paymentData.id, paymentData);
  }

  return { ok: true, encontrado: true, estado: paymentData.status, pago, paymentData };
}

async function procesarMerchantOrder(merchantOrderId) {
  const { data: order } = await obtenerMerchantOrderConTokens(merchantOrderId);
  const payments = Array.isArray(order.payments) ? order.payments : [];
  const approved = payments.find((payment) => payment.status === "approved");
  const anyPayment = approved || payments[0];

  if (!anyPayment) {
    return { ok: false, encontrado: false, order };
  }

  return procesarPaymentId(anyPayment.id);
}

exports.crearPreferenciaPrueba = async (req, res) => {
  try {
    const monto = Number(req.body.precio || precioBase());
    const titulo = req.body.titulo || "Asesoría EduQuak";

    if (!monto || monto < 1) {
      return res.status(400).json({ ok: false, message: "Precio inválido" });
    }

    const pago = await crearPagoPendiente({
      idAlumno: req.user.id_usuario,
      asesoria: {
        id_asesoria: req.body.idAsesoria || null,
        id_asesor: req.user.id_usuario,
        precio: monto
      },
      tipo: "prueba",
      monto
    });

    const requiereNuevaPreferencia = !pago.preference_id || (modoMarketplaceActivo() && pago.modo_pago !== "marketplace");

    const preference = requiereNuevaPreferencia
      ? await crearPreferencia({
          idPago: pago.id_pago,
          titulo,
          monto,
          idAsesoria: req.body.idAsesoria || null,
          tipo: "prueba",
          idAsesor: req.user.id_usuario
        })
      : {
          id: pago.preference_id,
          init_point: pago.init_point,
          sandbox_init_point: pago.sandbox_init_point
        };

    return res.json({
      ok: true,
      idPago: pago.id_pago,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      paymentUrl: obtenerUrlPago(preference),
      modoSandbox: usarSandboxMercadoPago(),
      monto,
      comisionEduquak: pago.comision_eduquak,
      montoAsesor: pago.monto_asesor
    });
  } catch (error) {
    console.error("Error creando preferencia de pago:", error.message, error.cause || "");
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || "No se pudo crear la preferencia de pago",
      detalle: error.message,
      cause: error.cause || null
    });
  }
};

exports.crearPreferenciaAsesoria = async (req, res) => {
  try {
    const idAlumno = req.user.id_usuario;
    const idAsesoria = req.params.id;

    const asesoria = await getQuery(
      `SELECT
         a.id_asesoria,
         a.id_alumno,
         a.id_asesor,
         a.estado,
         a.tipo,
         a.fecha,
         a.hora,
         COALESCE(a.precio, ases.precio_individual, $1) AS precio,
         a.estado_pago,
         u.nombre AS nombre_asesor,
         COALESCE(cpa.estado = 'conectada', false) AS asesor_mp_conectado
       FROM asesorias a
       JOIN usuarios u ON u.id_usuario = a.id_asesor
       LEFT JOIN asesores ases ON ases.id_usuario = a.id_asesor
       LEFT JOIN cuentas_pago_asesor cpa ON cpa.id_usuario = a.id_asesor AND cpa.estado = 'conectada'
       WHERE a.id_asesoria = $2`,
      [precioBase(), idAsesoria]
    );

    if (!asesoria) {
      return res.status(404).json({ ok: false, message: "Asesoría no encontrada" });
    }

    if (asesoria.estado !== "aceptada") {
      return res.status(400).json({ ok: false, message: "La asesoría debe estar aceptada para poder pagarse" });
    }

    if (asesoria.tipo === "individual" && Number(asesoria.id_alumno) !== Number(idAlumno)) {
      return res.status(403).json({ ok: false, message: "No puedes pagar una asesoría que no te pertenece" });
    }

    if (modoMarketplaceActivo() && !asesoria.asesor_mp_conectado) {
      return res.status(409).json({ ok: false, message: "El asesor aún no conectó su cuenta de Mercado Pago" });
    }

    if (["pagado", "aprobado"].includes(String(asesoria.estado_pago || "").toLowerCase())) {
      return res.json({ ok: true, yaPagado: true, message: "Esta asesoría ya está pagada" });
    }

    if (asesoria.tipo === "grupal") {
      const cupos = await getQuery(
        `SELECT
           a.cupo_maximo,
           (SELECT COUNT(*) FROM inscripciones_asesoria i WHERE i.id_asesoria = a.id_asesoria AND i.estado = 'inscrito') AS inscritos,
           (SELECT COUNT(*) FROM inscripciones_asesoria i2 WHERE i2.id_asesoria = a.id_asesoria AND i2.id_alumno = $1 AND i2.estado = 'inscrito') AS ya_inscrito
         FROM asesorias a
         WHERE a.id_asesoria = $2`,
        [idAlumno, idAsesoria]
      );

      if (Number(cupos?.ya_inscrito || 0) > 0) {
        return res.status(409).json({ ok: false, message: "Ya estás inscrito en esta asesoría" });
      }

      if (Number(cupos?.inscritos || 0) >= Number(cupos?.cupo_maximo || 0)) {
        return res.status(400).json({ ok: false, message: "Ya no hay lugares disponibles" });
      }
    }

    const pago = await crearPagoPendiente({
      idAlumno,
      asesoria,
      tipo: asesoria.tipo,
      monto: asesoria.precio
    });

    const titulo = asesoria.tipo === "grupal"
      ? `Asesoría grupal EduQuak con ${asesoria.nombre_asesor}`
      : `Asesoría individual EduQuak con ${asesoria.nombre_asesor}`;

    const requiereNuevaPreferencia = !pago.preference_id || (modoMarketplaceActivo() && pago.modo_pago !== "marketplace");

    const preference = requiereNuevaPreferencia
      ? await crearPreferencia({
          idPago: pago.id_pago,
          titulo,
          monto: pago.monto_total,
          idAsesoria,
          tipo: asesoria.tipo,
          idAsesor: asesoria.id_asesor
        })
      : {
          id: pago.preference_id,
          init_point: pago.init_point,
          sandbox_init_point: pago.sandbox_init_point
        };

    await runQuery(
      `UPDATE asesorias
       SET estado_pago = 'pendiente', precio = COALESCE(precio, $1), preference_id_pago = $2
       WHERE id_asesoria = $3`,
      [pago.monto_total, preference.id, idAsesoria]
    );

    return res.json({
      ok: true,
      idPago: pago.id_pago,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      paymentUrl: obtenerUrlPago(preference),
      modoSandbox: usarSandboxMercadoPago(),
      monto: pago.monto_total,
      comisionEduquak: pago.comision_eduquak,
      montoAsesor: pago.monto_asesor
    });
  } catch (error) {
    console.error("Error creando preferencia de asesoría:", error.message, error.cause || "");
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || "No se pudo crear el pago de la asesoría",
      detalle: error.message,
      cause: error.cause || null
    });
  }
};

exports.registrarRetorno = async (req, res) => {
  try {
    const {
      id_pago,
      payment_id,
      collection_id,
      status,
      collection_status,
      preference_id,
      merchant_order_id
    } = req.body;

    const idPago = id_pago || null;
    const paymentId = payment_id || collection_id || null;
    const estadoRetorno = collection_status || status || "pending";

    let pago = null;

    if (idPago) {
      pago = await getQuery(`SELECT * FROM pagos_asesoria WHERE id_pago = $1`, [idPago]);
    }

    if (!pago && preference_id) {
      pago = await getQuery(`SELECT * FROM pagos_asesoria WHERE preference_id = $1`, [preference_id]);
    }

    if (!pago) {
      return res.status(404).json({ ok: false, message: "Pago no encontrado" });
    }

    if (Number(pago.id_alumno) !== Number(req.user.id_usuario)) {
      return res.status(403).json({ ok: false, message: "No puedes registrar un pago que no te pertenece" });
    }

    if (paymentId) {
      const resultado = await procesarPaymentId(paymentId);

      if (resultado.estado === "approved") {
        return res.json({ ok: true, estado: "aprobado", message: "Pago aprobado correctamente" });
      }

      return res.json({ ok: true, estado: resultado.estado || "pendiente", message: "Pago registrado como pendiente o no aprobado" });
    }

    if (merchant_order_id) {
      const resultado = await procesarMerchantOrder(merchant_order_id);

      if (resultado.estado === "approved") {
        return res.json({ ok: true, estado: "aprobado", message: "Pago aprobado correctamente" });
      }
    }

    if (["approved", "success"].includes(String(estadoRetorno).toLowerCase()) && retornoConfiableSinWebhook()) {
      await marcarPagoAprobado(pago, {
        id: `retorno_${pago.id_pago}`,
        status: "approved",
        source: "retorno_local",
        preference_id,
        estadoRetorno
      });

      return res.json({ ok: true, estado: "aprobado", message: "Pago aprobado en modo local" });
    }

    await actualizarPagoNoAprobado(pago, estadoRetorno, null, { estadoRetorno, preference_id, merchant_order_id });

    return res.json({
      ok: true,
      estado: estadoRetorno === "failure" ? "rechazado" : "pendiente",
      message: "Pago recibido. En producción se confirmará por webhook de Mercado Pago."
    });
  } catch (error) {
    console.error("Error registrando retorno de pago:", error.message, error.cause || "");
    return res.status(500).json({ ok: false, message: "No se pudo registrar el resultado del pago", detalle: error.message });
  }
};

exports.webhook = async (req, res) => {
  try {
    const type = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
    const id = req.query.id || req.query["data.id"] || req.body?.data?.id || req.body?.id;

    if (!id) {
      return res.sendStatus(200);
    }

    if (String(type || "").includes("merchant_order")) {
      await procesarMerchantOrder(id);
      return res.sendStatus(200);
    }

    if (!type || String(type).includes("payment")) {
      await procesarPaymentId(id);
      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error webhook Mercado Pago:", error.message, error.cause || "");
    return res.sendStatus(200);
  }
};

exports.obtenerMisPagos = async (req, res) => {
  try {
    const pagos = await allQuery(
      `SELECT
         p.*,
         a.fecha,
         a.hora,
         a.tipo AS tipo_asesoria,
         u.nombre AS nombre_asesor
       FROM pagos_asesoria p
       LEFT JOIN asesorias a ON a.id_asesoria = p.id_asesoria
       LEFT JOIN usuarios u ON u.id_usuario = p.id_asesor
       WHERE p.id_alumno = $1
       ORDER BY p.fecha_creacion DESC`,
      [req.user.id_usuario]
    );

    return res.json({ ok: true, pagos });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "No se pudieron cargar tus pagos" });
  }
};

exports.obtenerResumenAdmin = async (req, res) => {
  try {
    const resumen = await getQuery(
      `SELECT
         COUNT(*) AS total_pagos,
         COALESCE(SUM(CASE WHEN estado = 'aprobado' THEN monto_total ELSE 0 END), 0) AS ventas_aprobadas,
         COALESCE(SUM(CASE WHEN estado = 'aprobado' THEN comision_eduquak ELSE 0 END), 0) AS comision_eduquak,
         COALESCE(SUM(CASE WHEN estado = 'aprobado' THEN monto_asesor ELSE 0 END), 0) AS ganancia_asesores
       FROM pagos_asesoria`
    );

    const pagos = await allQuery(
      `SELECT
         p.*,
         alumno.nombre AS nombre_alumno,
         asesor.nombre AS nombre_asesor,
         cpa.mp_user_id AS asesor_mp_user_id
       FROM pagos_asesoria p
       LEFT JOIN usuarios alumno ON alumno.id_usuario = p.id_alumno
       LEFT JOIN usuarios asesor ON asesor.id_usuario = p.id_asesor
       LEFT JOIN cuentas_pago_asesor cpa ON cpa.id_usuario = p.id_asesor AND cpa.estado = 'conectada'
       ORDER BY p.fecha_creacion DESC
       LIMIT 80`
    );

    return res.json({ ok: true, resumen, pagos });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "No se pudo cargar el resumen de pagos" });
  }
};
