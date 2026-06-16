require("dotenv").config();

process.env.TZ = process.env.APP_TIMEZONE || process.env.TZ || "America/Mexico_City";

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const demoRoutes = require("./routes/demo.routes");
const adminRoutes = require("./routes/admin.routes");
const asesoriasRoutes = require("./routes/asesorias.routes");
const materialesRoutes = require("./routes/materiales.routes");
const cuestionariosRoutes = require("./routes/cuestionarios.routes");
const resenasRoutes = require("./routes/resenas.routes");
const statsRoutes = require("./routes/stats.routes");
const chatRoutes = require("./routes/chat.routes");
const pagosRoutes = require("./routes/pagos.routes");
const mercadoPagoRoutes = require("./routes/mercadopago.routes");

const app = express();

async function asegurarEsquemaOperativo() {
  const queries = [
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS fecha_anterior TEXT`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS hora_anterior TEXT`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS reagendada BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS motivo_reagenda TEXT`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS fecha_reagenda TIMESTAMP`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS reagendada_por INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL`,
    `ALTER TABLE reportes_asesoria ALTER COLUMN fecha_reporte SET DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City')`,
    `ALTER TABLE reportes_asesoria ADD COLUMN IF NOT EXISTS fecha_revisado TIMESTAMP`,
    `ALTER TABLE reportes_asesoria ADD COLUMN IF NOT EXISTS fecha_resuelto TIMESTAMP`,
    `ALTER TABLE reportes_asesoria ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `CREATE TABLE IF NOT EXISTS sanciones_usuario (
      id_sancion SERIAL PRIMARY KEY,
      id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      id_reporte INTEGER REFERENCES reportes_asesoria(id_reporte) ON DELETE SET NULL,
      aplicada_por INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      motivo TEXT NOT NULL,
      fecha_inicio TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City'),
      fecha_fin TIMESTAMP NOT NULL,
      estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','vencida','cancelada'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sanciones_usuario_activa ON sanciones_usuario(id_usuario, estado, fecha_fin)`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS precio NUMERIC(10,2) DEFAULT 100`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'sin_pago'`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS preference_id_pago TEXT`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS payment_id TEXT`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS monto_total NUMERIC(10,2)`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS comision_eduquak NUMERIC(10,2)`,
    `ALTER TABLE asesorias ADD COLUMN IF NOT EXISTS monto_asesor NUMERIC(10,2)`,
    `ALTER TABLE asesores ADD COLUMN IF NOT EXISTS precio_individual NUMERIC(10,2) DEFAULT 100`,
    `ALTER TABLE asesores ADD COLUMN IF NOT EXISTS mp_conectado BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE asesores ADD COLUMN IF NOT EXISTS mp_user_id TEXT`,
    `CREATE TABLE IF NOT EXISTS pagos_asesoria (
      id_pago SERIAL PRIMARY KEY,
      id_asesoria INTEGER REFERENCES asesorias(id_asesoria) ON DELETE SET NULL,
      id_alumno INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      id_asesor INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      tipo TEXT DEFAULT 'individual',
      monto_total NUMERIC(10,2) NOT NULL,
      comision_eduquak NUMERIC(10,2) NOT NULL,
      monto_asesor NUMERIC(10,2) NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      estado_mp TEXT,
      preference_id TEXT,
      payment_id TEXT,
      init_point TEXT,
      sandbox_init_point TEXT,
      respuesta_mp TEXT,
      fecha_creacion TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City'),
      fecha_aprobacion TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pagos_asesoria_estado ON pagos_asesoria(id_asesoria, id_alumno, estado)`,
    `CREATE INDEX IF NOT EXISTS idx_pagos_preference ON pagos_asesoria(preference_id)`,
    `ALTER TABLE pagos_asesoria ADD COLUMN IF NOT EXISTS merchant_order_id TEXT`,
    `ALTER TABLE pagos_asesoria ADD COLUMN IF NOT EXISTS marketplace_fee NUMERIC(10,2)`,
    `ALTER TABLE pagos_asesoria ADD COLUMN IF NOT EXISTS modo_pago TEXT DEFAULT 'plataforma'`,
    `ALTER TABLE pagos_asesoria ADD COLUMN IF NOT EXISTS vendedor_mp_user_id TEXT`,
    `CREATE TABLE IF NOT EXISTS cuentas_pago_asesor (
      id_cuenta SERIAL PRIMARY KEY,
      id_usuario INTEGER NOT NULL UNIQUE REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      mp_user_id TEXT,
      public_key TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_type TEXT,
      scope TEXT,
      live_mode BOOLEAN DEFAULT FALSE,
      expires_in INTEGER,
      fecha_expiracion TIMESTAMP,
      fecha_conexion TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City'),
      fecha_actualizacion TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City'),
      estado TEXT NOT NULL DEFAULT 'conectada' CHECK (estado IN ('conectada','desconectada','revocada','error')),
      respuesta_mp TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cuentas_pago_asesor_estado ON cuentas_pago_asesor(id_usuario, estado)`
  ];

  for (const query of queries) {
    await db.query(query);
  }

  await db.query(`
    UPDATE sanciones_usuario
    SET estado = 'vencida'
    WHERE estado = 'activa'
      AND fecha_fin <= (NOW() AT TIME ZONE 'America/Mexico_City')
  `);
}

const PORT =
  process.env.PORT || 3000;


app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);



const uploadsPath =
  path.join(__dirname, "uploads");

console.log("UPLOADS PATH:");
console.log(uploadsPath);

app.use(
  "/uploads",

  express.static(uploadsPath, {

    setHeaders: (
      res,
      filePath
    ) => {

      if (
        filePath
          .toLowerCase()
          .endsWith(".pdf")
      ) {

        res.setHeader(
          "Content-Type",
          "application/pdf"
        );

        res.setHeader(
          "Content-Disposition",
          "inline"
        );

      }

    }

  })
);


const iaRoutes = require("./routes/ia.routes");



const reportesPath =
  path.join(
    __dirname,
    "..",
    "uploads",
    "reportes"
  );

console.log("REPORTES PATH:");
console.log(reportesPath);

app.use(
  "/uploads/reportes",

  express.static(reportesPath, {

    setHeaders: (
      res,
      filePath
    ) => {

      if (
        filePath
          .toLowerCase()
          .endsWith(".pdf")
      ) {

        res.setHeader(
          "Content-Type",
          "application/pdf"
        );

        res.setHeader(
          "Content-Disposition",
          "inline"
        );

      }

    }

  })
);


app.get(
  "/health",
  (req, res) => {

    res.json({

      ok: true,

      message:
        "Servidor funcionando correctamente",

      time:
        new Date().toISOString()

    });

  }
);


app.get(
  "/",
  (req, res) => {

    res.sendFile(

      path.join(
        __dirname,
        "../../frontend/index.html"
      )

    );

  }
);


app.use(
  express.static(
    path.join(
      __dirname,
      "../../frontend"
    )
  )
);


app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  usersRoutes
);

app.use(
  "/api/demo",
  demoRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/asesorias",
  asesoriasRoutes
);

app.use(
  "/api/materiales",
  materialesRoutes
);

app.use(
  "/api/cuestionarios",
  cuestionariosRoutes
);

app.use(
  "/api/resenas",
  resenasRoutes
);

app.use(
  "/api/stats",
  statsRoutes
);

app.use(
  "/api/chat",
  chatRoutes
);

app.use("/api/ia", iaRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/mercadopago", mercadoPagoRoutes);


async function iniciarServidor() {
  try {
    await asegurarEsquemaOperativo();
    console.log("✅ Esquema operativo verificado");
  } catch (error) {
    console.error("❌ Error verificando esquema operativo:", error.message);
  }

  app.listen(
    PORT,
    () => {

      console.log(
        `🚀 Servidor corriendo en http://localhost:${PORT}`
      );

    }
  );
}

iniciarServidor();
