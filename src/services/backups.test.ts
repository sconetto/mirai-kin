import "dotenv/config";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { backups } from "@/db/schema";
import { pruneBackups } from "./backups";

const DAY = 86_400_000;

describe.skipIf(!process.env.DATABASE_URL)("backup retention", () => {
  let dir = "";
  let oldId = "";
  let newId = "";
  const oldFile = "old.dump";
  const newFile = "new.dump";

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "mirai-kin-backup-"));
    await writeFile(path.join(dir, oldFile), "old");
    await writeFile(path.join(dir, newFile), "new");

    const db = getDb();
    const rows = await db
      .insert(backups)
      .values([
        {
          filename: oldFile,
          sizeBytes: 3,
          status: "success",
          createdAt: new Date(Date.now() - 3 * DAY),
        },
        {
          filename: newFile,
          sizeBytes: 3,
          status: "success",
          createdAt: new Date(),
        },
      ])
      .returning();
    oldId = rows[0].id;
    newId = rows[1].id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(backups).where(inArray(backups.id, [oldId, newId]));
    if (dir) await rm(dir, { recursive: true, force: true });
    await closeDb();
  });

  it("deletes dumps and rows older than the retention window", async () => {
    const removed = await pruneBackups(2, dir);
    expect(removed).toBe(1);
    await expect(access(path.join(dir, oldFile))).rejects.toThrow();
    await expect(access(path.join(dir, newFile))).resolves.toBeUndefined();
  });
});
