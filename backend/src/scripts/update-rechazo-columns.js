require("dotenv").config();

const db = require("../db");

const columnas = [
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_rechazo TIMESTAMP",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS documento_reenviado BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_reenvio_documento TIMESTAMP"
];

async function actualizar() {
  try {
    for (const sql of columnas) {
      await db.run(sql);
      console.log("✅ Columna revisada:", sql);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error actualizando columnas:", error.message);
    process.exit(1);
  }
}

actualizar();
