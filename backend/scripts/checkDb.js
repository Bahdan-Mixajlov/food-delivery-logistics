import "dotenv/config";
import { db } from "../config/db.js";

const main = async () => {
  const [rows] = await db.query("SELECT DATABASE() AS db, VERSION() AS version");
  console.log(rows[0]);
  const [tables] = await db.query("SHOW TABLES");
  console.log(tables.map((t) => Object.values(t)[0]).join(", "));
  await db.end();
};

main().catch((e) => {
  console.error("DB ERROR:", e.message);
  process.exitCode = 1;
});
