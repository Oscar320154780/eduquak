const db = require("../db");
async function runQuery(sql, params = []) {

  const result = await db.query(
    sql,
    params
  );

  return {
    rows: result.rows,
    rowCount: result.rowCount
  };
}

async function getQuery(sql, params = []) {

  const result = await db.query(
    sql,
    params
  );

  return result.rows[0] || null;
}

async function allQuery(sql, params = []) {

  const result = await db.query(
    sql,
    params
  );

  return result.rows;
}

module.exports = {
  runQuery,
  getQuery,
  allQuery
};
