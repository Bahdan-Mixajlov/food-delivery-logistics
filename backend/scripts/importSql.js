import "dotenv/config";
import fs from "node:fs";
import mysql from "mysql2/promise";

const file = process.argv[2];
const target = process.argv[3];
if (!file || !target) {
  console.error("usage: node scripts/importSql.js <file.sql> <database>");
  process.exit(1);
}

const sql = fs.readFileSync(file, "utf8");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: target,
  multipleStatements: true,
  charset: "utf8mb4",
});

try {
  await conn.query(sql);
  const [rows] = await conn.query("SELECT COUNT(*) AS c FROM dish");
  const [dish] = await conn.query("SELECT name FROM dish ORDER BY id_dish LIMIT 1");
  console.log("imported, dishes:", rows[0].c, "first:", dish[0]?.name);
} catch (error) {
  console.error("ERROR:", error.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
