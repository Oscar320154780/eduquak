require("dotenv").config();

const db = require("../db");

async function main() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_lecturas (
        id_lectura SERIAL PRIMARY KEY,
        id_asesoria INTEGER NOT NULL,
        id_usuario INTEGER NOT NULL,
        ultimo_leido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (id_asesoria, id_usuario),
        FOREIGN KEY (id_asesoria)
          REFERENCES asesorias(id_asesoria)
          ON DELETE CASCADE,
        FOREIGN KEY (id_usuario)
          REFERENCES usuarios(id_usuario)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chat_lecturas_usuario
      ON chat_lecturas(id_usuario);

      CREATE INDEX IF NOT EXISTS idx_chat_lecturas_asesoria_usuario
      ON chat_lecturas(id_asesoria, id_usuario);

      CREATE INDEX IF NOT EXISTS idx_chat_mensajes_asesoria_fecha
      ON chat_mensajes(id_asesoria, fecha_envio);
    `);

    console.log("✅ Tabla chat_lecturas e índices creados/verificados correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creando chat_lecturas:", error.message);
    process.exit(1);
  }
}

main();
