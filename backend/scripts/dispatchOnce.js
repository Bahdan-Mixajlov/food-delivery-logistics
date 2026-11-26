import "dotenv/config";
import { dispatch } from "../services/plannerService.js";
import { db } from "../config/db.js";

const main = async () => {
  const result = await dispatch();
  console.log(JSON.stringify(result, null, 2));
  await db.end();
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
