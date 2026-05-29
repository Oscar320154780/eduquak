require("dotenv").config();

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en el archivo .env");
  process.exit(1);
}

const usarSSL =
  process.env.DATABASE_URL.includes("sslmode=require") ||
  process.env.PGSSL === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSSL
    ? { rejectUnauthorized: false }
    : false
});

const primaryKeys = {
  usuarios: "id_usuario",
  alumnos: "id_alumno",
  asesores: "id_asesor",
  admins: "id_admin",
  asesorias: "id_asesoria",
  materiales: "id_material",
  cuestionarios: "id_cuestionario",
  preguntas: "id_pregunta",
  resultados_cuestionario: "id_resultado",
  resenas_asesor: "id_resena",
  inscripciones_asesoria: "id_inscripcion",
  reportes_asesoria: "id_reporte",
  chat_mensajes: "id_mensaje"
};

function normalizarSQL(sql) {
  let index = 0;

  return String(sql).replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function agregarReturningSiAplica(sql) {
  const limpio = String(sql).trim();

  if (!/^insert\s+into\s+/i.test(limpio)) {
    return sql;
  }

  if (/\breturning\b/i.test(limpio)) {
    return sql;
  }

  const match = limpio.match(/^insert\s+into\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);

  if (!match) {
    return sql;
  }

  const tabla = match[1];
  const pk = primaryKeys[tabla];

  if (!pk) {
    return sql;
  }

  return `${sql} RETURNING ${pk}`;
}

async function ejecutar(sql, params = []) {
  const sqlConReturning = agregarReturningSiAplica(sql);
  const sqlPostgres = normalizarSQL(sqlConReturning);

  return pool.query(sqlPostgres, params);
}

async function query(sql, params = []) {
  return ejecutar(sql, params);
}

async function get(sql, params = [], callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  try {
    const result = await ejecutar(sql, params);
    const row = result.rows[0] || null;

    if (callback) {
      callback(null, row);
      return;
    }

    return row;
  } catch (error) {
    if (callback) {
      callback(error);
      return;
    }

    throw error;
  }
}

async function all(sql, params = [], callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  try {
    const result = await ejecutar(sql, params);
    const rows = result.rows;

    if (callback) {
      callback(null, rows);
      return;
    }

    return rows;
  } catch (error) {
    if (callback) {
      callback(error);
      return;
    }

    throw error;
  }
}

async function run(sql, params = [], callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  try {
    const result = await ejecutar(sql, params);
    const firstRow = result.rows[0] || {};
    const lastID = Object.values(firstRow)[0] || null;

    const response = {
      rows: result.rows,
      rowCount: result.rowCount,
      changes: result.rowCount,
      lastID
    };

    if (callback) {
      callback.call(response, null);
      return;
    }

    return response;
  } catch (error) {
    if (callback) {
      callback.call({}, error);
      return;
    }

    throw error;
  }
}

pool.connect()
  .then((client) => {
    console.log("✅ PostgreSQL conectado");
    client.release();
  })
  .catch((error) => {
    console.error("❌ Error PostgreSQL:", error.message);
  });

module.exports = {
  pool,
  query,
  get,
  all,
  run,
  normalizarSQL
};
