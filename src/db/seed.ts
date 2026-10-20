import "dotenv/config";
import { ensureSeed } from "./ensure-seed";
import { closeDb } from "./index";

ensureSeed()
  .then(async () => {
    console.log("Seed complete");
    await closeDb();
  })
  .catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
