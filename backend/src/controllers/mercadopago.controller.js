const crypto = require("crypto");
const { runQuery, getQuery } = require("../utils/dbHelpers");

function baseFrontend() {
  return process.env.FRONTEND_URL || process.env.BACKEND_URL || "http://localhost:3000";
}

function redirectUri() {
  return process.env.MERCADOPAGO_REDIRECT_URI || `${process.env.BACKEND_URL || "http://localhost:3000"}/api/mercadopago/callback`;
}

function oauthAuthUrl() {
  return process.env.MERCADOPAGO_OAUTH_AUTH_URL || "https://auth.mercadopago.com.mx/authorization";
}

function clientId() {
  return process.env.MERCADOPAGO_CLIENT_ID || "";
}

function clientSecret() {
  return process.env.MERCADOPAGO_CLIENT_SECRET || "";
}

function firmar(payload) {
  const secret = process.env.JWT_SECRET || "eduquak_secret";
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function crearState(idUsuario) {
  const payload = Buffer.from(JSON.stringify({ id_usuario: idUsuario, ts: Date.now() })).toString("base64url");
  return `${payload}.${firmar(payload)}`;
}

function leerState(state) {
  const [payload, signature] = String(state || "").split(".");

  if (!payload || !signature || firmar(payload) !== signature) {
    return null;
  }

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const maxAge = 1000 * 60 * 60;

  if (!data.id_usuario || !data.ts || Date.now() - Number(data.ts) > maxAge) {
    return null;
  }

  return data;
}

async function intercambiarCodePorToken(code) {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      client_secret: clientSecret(),
      client_id: clientId(),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri()
    })
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error_description || data?.error || "No se pudo conectar Mercado Pago");
    error.status = response.status;
    error.cause = data;
    throw error;
  }

  return data;
}

exports.obtenerEstado = async (req, res) => {
  try {
    const cuenta = await getQuery(
      `SELECT id_cuenta, mp_user_id, public_key, live_mode, fecha_conexion, fecha_actualizacion, estado
       FROM cuentas_pago_asesor
       WHERE id_usuario = $1
       ORDER BY fecha_actualizacion DESC NULLS LAST, fecha_conexion DESC
       LIMIT 1`,
      [req.user.id_usuario]
    );

    return res.json({
      ok: true,
      conectado: cuenta?.estado === "conectada",
      cuenta: cuenta || null,
      oauthConfigurado: Boolean(clientId() && clientSecret())
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "No se pudo consultar Mercado Pago" });
  }
};

exports.obtenerUrlConexion = async (req, res) => {
  try {
    if (req.user.rol !== "asesor") {
      return res.status(403).json({ ok: false, message: "Solo los asesores pueden conectar Mercado Pago" });
    }

    if (!clientId() || !clientSecret()) {
      return res.status(500).json({
        ok: false,
        message: "Faltan MERCADOPAGO_CLIENT_ID y MERCADOPAGO_CLIENT_SECRET en el entorno"
      });
    }

    const params = new URLSearchParams({
      client_id: clientId(),
      response_type: "code",
      platform_id: "mp",
      state: crearState(req.user.id_usuario),
      redirect_uri: redirectUri()
    });

    return res.json({ ok: true, url: `${oauthAuthUrl()}?${params.toString()}` });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "No se pudo crear la conexión con Mercado Pago" });
  }
};

exports.callback = async (req, res) => {
  const frontend = baseFrontend();

  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.redirect(`${frontend}/pages/perfil_asesor.html?mp=error&detalle=${encodeURIComponent(error_description || error)}`);
    }

    const dataState = leerState(state);

    if (!dataState || !code) {
      return res.redirect(`${frontend}/pages/perfil_asesor.html?mp=error&detalle=${encodeURIComponent("Conexión inválida o expirada")}`);
    }

    const tokenData = await intercambiarCodePorToken(code);
    const idUsuario = dataState.id_usuario;
    const expiresIn = Number(tokenData.expires_in || 0);

    await runQuery(
      `INSERT INTO cuentas_pago_asesor (
         id_usuario,
         mp_user_id,
         public_key,
         access_token,
         refresh_token,
         token_type,
         scope,
         live_mode,
         expires_in,
         fecha_expiracion,
         fecha_conexion,
         fecha_actualizacion,
         estado,
         respuesta_mp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
         CASE WHEN $9 > 0 THEN (NOW() AT TIME ZONE 'America/Mexico_City') + ($9 || ' seconds')::interval ELSE NULL END,
         (NOW() AT TIME ZONE 'America/Mexico_City'),
         (NOW() AT TIME ZONE 'America/Mexico_City'),
         'conectada',
         $10
       )
       ON CONFLICT (id_usuario) DO UPDATE SET
         mp_user_id = EXCLUDED.mp_user_id,
         public_key = EXCLUDED.public_key,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_type = EXCLUDED.token_type,
         scope = EXCLUDED.scope,
         live_mode = EXCLUDED.live_mode,
         expires_in = EXCLUDED.expires_in,
         fecha_expiracion = EXCLUDED.fecha_expiracion,
         fecha_actualizacion = (NOW() AT TIME ZONE 'America/Mexico_City'),
         estado = 'conectada',
         respuesta_mp = EXCLUDED.respuesta_mp`,
      [
        idUsuario,
        tokenData.user_id ? String(tokenData.user_id) : null,
        tokenData.public_key || null,
        tokenData.access_token,
        tokenData.refresh_token || null,
        tokenData.token_type || null,
        tokenData.scope || null,
        tokenData.live_mode === true,
        expiresIn,
        JSON.stringify(tokenData)
      ]
    );

    await runQuery(
      `UPDATE asesores
       SET mp_conectado = true,
           mp_user_id = $1
       WHERE id_usuario = $2`,
      [tokenData.user_id ? String(tokenData.user_id) : null, idUsuario]
    );

    return res.redirect(`${frontend}/pages/perfil_asesor.html?mp=connected`);
  } catch (error) {
    console.error("Error OAuth Mercado Pago:", error.message, error.cause || "");
    return res.redirect(`${frontend}/pages/perfil_asesor.html?mp=error&detalle=${encodeURIComponent(error.message || "Error al conectar Mercado Pago")}`);
  }
};

exports.desconectar = async (req, res) => {
  try {
    await runQuery(
      `UPDATE cuentas_pago_asesor
       SET estado = 'desconectada', fecha_actualizacion = (NOW() AT TIME ZONE 'America/Mexico_City')
       WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );

    await runQuery(
      `UPDATE asesores
       SET mp_conectado = false
       WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );

    return res.json({ ok: true, message: "Cuenta de Mercado Pago desconectada" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "No se pudo desconectar Mercado Pago" });
  }
};
