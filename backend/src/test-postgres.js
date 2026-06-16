require("dotenv").config();

const db = require("./db");

async function test() {
  try {
    const result = await db.query("SELECT NOW() AS fecha_servidor");

    console.log("✅ PostgreSQL funcionando:");
    console.log(result.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error probando PostgreSQL:", error.message);
    process.exit(1);
  }
}

test();
