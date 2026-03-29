import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "@/db/client";

async function run(): Promise<void> {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Drizzle migration completed.");
}

run().catch((error) => {
  console.error("Drizzle migration failed", error);
  process.exit(1);
});
