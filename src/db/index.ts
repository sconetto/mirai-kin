import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DrizzleDb = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __finPool?: Pool;
  __finDb?: DrizzleDb;
};

export function getPool(): Pool {
  if (!globalForDb.__finPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForDb.__finPool = new Pool({ connectionString, max: 10 });
  }
  return globalForDb.__finPool;
}

export function getDb(): DrizzleDb {
  if (!globalForDb.__finDb) {
    globalForDb.__finDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__finDb;
}

export async function closeDb(): Promise<void> {
  if (globalForDb.__finPool) {
    await globalForDb.__finPool.end();
    globalForDb.__finPool = undefined;
    globalForDb.__finDb = undefined;
  }
}

export { schema };
