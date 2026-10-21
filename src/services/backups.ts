import { execFile } from "node:child_process";
import { mkdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { backups } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { getSettings } from "./settings";

const run = promisify(execFile);

export function getBackupDir(): string {
  return process.env.BACKUP_DIR || "/backups";
}

export async function listBackups() {
  const db = getDb();
  return db.select().from(backups).orderBy(desc(backups.createdAt)).limit(100);
}

export async function getBackup(id: string) {
  const db = getDb();
  const [row] = await db.select().from(backups).where(eq(backups.id, id)).limit(1);
  return row ?? null;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function runBackup() {
  const db = getDb();
  const databaseUrl = getEnv().DATABASE_URL;
  const dir = getBackupDir();
  const filename = `mirai-kin-${timestamp()}.dump`;
  const file = path.join(dir, filename);

  if (!databaseUrl) {
    const [failed] = await db
      .insert(backups)
      .values({
        filename,
        sizeBytes: 0,
        status: "failed",
        error: "DATABASE_URL is not configured.",
      })
      .returning();
    return failed;
  }

  try {
    await mkdir(dir, { recursive: true });
    await run("pg_dump", ["-Fc", "-f", file, databaseUrl], {
      maxBuffer: 1024 * 1024 * 64,
    });

    const info = await stat(file);
    if (info.size === 0) throw new Error("The dump file is empty.");

    await run("pg_restore", ["--list", file], { maxBuffer: 1024 * 1024 * 16 });

    const [row] = await db
      .insert(backups)
      .values({
        filename,
        sizeBytes: info.size,
        status: "success",
      })
      .returning();
    return row;
  } catch (error) {
    await unlink(file).catch(() => undefined);
    const [failed] = await db
      .insert(backups)
      .values({
        filename,
        sizeBytes: 0,
        status: "failed",
        error: error instanceof Error ? error.message : "Backup failed.",
      })
      .returning();
    return failed;
  }
}

export async function pruneBackups(retentionDays: number, dir = getBackupDir()) {
  const db = getDb();
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const rows = await db.select().from(backups).where(lt(backups.createdAt, cutoff));

  for (const row of rows) {
    await unlink(path.join(dir, row.filename)).catch(() => undefined);
    await db.delete(backups).where(eq(backups.id, row.id));
  }

  return rows.length;
}

export async function runBackupAndPrune(retentionDays?: number) {
  const settings = await getSettings();
  if (!settings.backup.enabled) return null;
  const row = await runBackup();
  await pruneBackups(retentionDays ?? settings.backup.retentionDays);
  return row;
}

export async function readBackupFile(id: string) {
  const row = await getBackup(id);
  if (!row || row.status !== "success") return null;
  const file = path.join(getBackupDir(), row.filename);
  try {
    return { row, data: await readFile(file) };
  } catch {
    return null;
  }
}
