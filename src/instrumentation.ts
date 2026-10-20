export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.DATABASE_URL) {
    if (process.env.SKIP_MIGRATIONS !== "true") {
      try {
        const { migrate } = await import("drizzle-orm/node-postgres/migrator");
        const { getDb } = await import("./db");
        await migrate(getDb(), { migrationsFolder: "./drizzle" });
        console.log("[db] migrations applied");
      } catch (error) {
        console.error("[db] migration failed", error);
      }
    }

    try {
      const { ensureSeed } = await import("./db/ensure-seed");
      await ensureSeed();
      console.log("[db] seed ensured");
    } catch (error) {
      console.error("[db] seed failed", error);
    }
  }

  const { startWorkers } = await import("./lib/jobs");
  await startWorkers();
}
