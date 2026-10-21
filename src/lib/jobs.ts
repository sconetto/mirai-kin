import { PgBoss } from "pg-boss";
import { getEnv } from "./env";
import { recordSnapshot } from "@/services/equity";
import { fetchAndStoreRates } from "@/services/fx";

export const FX_JOB_NAME = "fx-daily";
export const NET_WORTH_JOB_NAME = "net-worth-snapshot";

let bossPromise: Promise<PgBoss> | null = null;

function connectionString(): string {
  const url = getEnv().DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to start background jobs");
  }
  return url;
}

export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss(connectionString());
      boss.on("error", (error: Error) => {
        console.error("[pg-boss] error", error);
      });

      await boss.start();

      await boss.createQueue(FX_JOB_NAME, {
        retryLimit: 5,
        retryDelay: 60,
        retryBackoff: true,
        retryDelayMax: 3600,
      });
      await boss.createQueue(NET_WORTH_JOB_NAME, {
        retryLimit: 5,
        retryDelay: 60,
        retryBackoff: true,
        retryDelayMax: 3600,
      });

      await boss.work(FX_JOB_NAME, async () => {
        const stored = await fetchAndStoreRates();
        console.log(`[fx] stored ${stored} rate rows`);
      });

      await boss.work(NET_WORTH_JOB_NAME, async () => {
        const snapshot = await recordSnapshot();
        console.log(`[equity] snapshot ${snapshot?.date ?? "skipped"}`);
      });

      // Daily at 06:00 and 06:30 server time.
      await boss.schedule(FX_JOB_NAME, "0 6 * * *", {});
      await boss.schedule(NET_WORTH_JOB_NAME, "30 6 * * *", {});

      return boss;
    })();
  }

  return bossPromise;
}

export async function startWorkers(): Promise<void> {
  try {
    await getBoss();
    console.log("[jobs] pg-boss started (fx-daily + net-worth-snapshot scheduled)");
  } catch (error) {
    console.error("[jobs] failed to start pg-boss", error);
  }
}

export async function stopWorkers(): Promise<void> {
  if (bossPromise) {
    const boss = await bossPromise;
    await boss.stop();
    bossPromise = null;
  }
}
