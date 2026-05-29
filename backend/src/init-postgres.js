require("dotenv").config();

const fs = require("fs");
const path = require("path");
const db = require("./db");

async function init() {
  try {
    const schemaPath = path.join(__dirname, "schema-postgres.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    await db.query(schema);

    console.log("✅ Tablas PostgreSQL creadas correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creando tablas PostgreSQL:", error.message);
    process.exit(1);
  }
}

init();
