require("dotenv").config();

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en el archivo .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.PGSSL === "true"
      ? { rejectUnauthorized: false }
      : false
});

async function resetDatabase() {
  const client = await pool.connect();

  try {
    console.log("✅ PostgreSQL conectado");
    console.log("🧹 Limpiando base de datos...");

    await client.query("BEGIN");

    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map((row) => row.tablename);

    if (tables.length > 0) {
      const tableNames = tables
        .map((table) => `"public"."${table}"`)
        .join(", ");

      await client.query(`
        TRUNCATE TABLE ${tableNames}
        RESTART IDENTITY
        CASCADE
      `);
    }

    const hashedPassword = await bcrypt.hash("Admin123*", 10);

    await client.query(
      `
      INSERT INTO usuarios (
        nombre,
        correo,
        password,
        rol,
        estado_validacion,
        institucion,
        telefono,
        badge_verificacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        "Administrador",
        "admin@eduquak.com",
        hashedPassword,
        "admin",
        "verificado",
        "EduQuak",
        "",
        "Verificado"
      ]
    );

    await client.query("COMMIT");

    console.log("✅ Base de datos limpiada correctamente");
    console.log("✅ Admin creado correctamente");
    console.log("Correo: admin@eduquak.com");
    console.log("Password: Admin123*");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error limpiando la base de datos:");
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();