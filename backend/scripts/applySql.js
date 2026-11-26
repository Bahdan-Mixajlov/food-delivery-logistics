import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const file = process.argv[2];
if (!file) {
  console.error("Укажите файл: node scripts/applySql.js sql/logistics.sql");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), "utf8");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  await connection.query(sql);
  console.log("Применено:", file);
} catch (error) {
  console.error("Ошибка:", error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
