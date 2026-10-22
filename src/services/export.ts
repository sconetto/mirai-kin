import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";
import { getDb } from "@/db";
import {
  accountReconciliations,
  accounts,
  backups,
  beneficiaries,
  brokerageLots,
  brokerageSales,
  budgets,
  categories,
  debtSchedule,
  debts,
  dividends,
  estateAssets,
  estateDocuments,
  goals,
  importBatches,
  importProfiles,
  insightAcknowledgements,
  investmentPositions,
  investmentPrices,
  labels,
  netWorthSnapshots,
  recurringDetections,
  recurringTransactions,
  savedReports,
  scenarios,
  settings,
  transactionRules,
  transactions,
  transfers,
} from "@/db/schema";

const SECRET_KEY = /key|secret|token|password/i;

export async function collectExportData() {
  const db = getDb();
  const [
    accountRows,
    categoryRows,
    labelRows,
    transactionRows,
    transferRows,
    budgetRows,
    positionRows,
    priceRows,
    lotRows,
    saleRows,
    dividendRows,
    debtRows,
    scheduleRows,
    recurringRows,
    detectionRows,
    ruleRows,
    goalRows,
    scenarioRows,
    estateAssetRows,
    beneficiaryRows,
    documentRows,
    snapshotRows,
    reportRows,
    settingRows,
    reconciliationRows,
    importBatchRows,
    profileRows,
    backupRows,
    ackRows,
  ] = await Promise.all([
    db.select().from(accounts),
    db.select().from(categories),
    db.select().from(labels),
    db.select().from(transactions),
    db.select().from(transfers),
    db.select().from(budgets),
    db.select().from(investmentPositions),
    db.select().from(investmentPrices),
    db.select().from(brokerageLots),
    db.select().from(brokerageSales),
    db.select().from(dividends),
    db.select().from(debts),
    db.select().from(debtSchedule),
    db.select().from(recurringTransactions),
    db.select().from(recurringDetections),
    db.select().from(transactionRules),
    db.select().from(goals),
    db.select().from(scenarios),
    db.select().from(estateAssets),
    db.select().from(beneficiaries),
    db.select().from(estateDocuments),
    db.select().from(netWorthSnapshots),
    db.select().from(savedReports),
    db.select().from(settings),
    db.select().from(accountReconciliations),
    db.select().from(importBatches),
    db.select().from(importProfiles),
    db.select().from(backups),
    db.select().from(insightAcknowledgements),
  ]);

  const domains = {
    accounts: accountRows,
    categories: categoryRows,
    labels: labelRows,
    transactions: transactionRows,
    transfers: transferRows,
    budgets: budgetRows,
    investments: { positions: positionRows, prices: priceRows },
    brokerage: { lots: lotRows, sales: saleRows, dividends: dividendRows },
    debts: { debts: debtRows, schedule: scheduleRows },
    recurring: { transactions: recurringRows, detections: detectionRows },
    rules: ruleRows,
    goals: goalRows,
    scenarios: scenarioRows,
    estate: {
      assets: estateAssetRows,
      beneficiaries: beneficiaryRows,
      documents: documentRows,
    },
    equity: snapshotRows,
    savedReports: reportRows,
    settings: settingRows.filter((row) => !SECRET_KEY.test(row.key)),
    reconciliations: reconciliationRows,
    imports: { batches: importBatchRows, profiles: profileRows },
    backups: backupRows,
    insightAcknowledgements: ackRows,
  };

  return {
    domains,
    manifest: {
      app: "mirai-kin",
      exportedAt: new Date().toISOString(),
      version: 1,
      note: "Secrets, assistant conversations, messages, actions, and tool calls are excluded.",
      counts: Object.fromEntries(
        Object.entries(domains).map(([key, value]) => [
          key,
          Array.isArray(value)
            ? value.length
            : Object.fromEntries(
                Object.entries(value as Record<string, unknown>).map(([nested, rows]) => [
                  nested,
                  Array.isArray(rows) ? rows.length : 0,
                ]),
              ),
        ]),
      ),
    },
  };
}

export async function createFullExport(): Promise<Buffer> {
  const { domains, manifest } = await collectExportData();
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  stream.on("data", (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<void>((resolve, reject) => {
    stream.on("end", () => resolve());
    stream.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(stream);

  for (const [name, data] of Object.entries(domains)) {
    archive.append(JSON.stringify(data, null, 2), { name: `${name}.json` });
  }
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  await archive.finalize();
  await finished;
  return Buffer.concat(chunks);
}
