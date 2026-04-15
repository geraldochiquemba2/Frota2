import { db } from "./src/index.js";
import { financeRecordsTable } from "./src/schema/index.js";

async function main() {
  console.log("Limpando registos financeiros...");
  await db.delete(financeRecordsTable);
  console.log("Registos limpos com sucesso! Total: 0 Kz");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
