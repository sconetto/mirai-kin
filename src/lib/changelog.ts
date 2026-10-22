import fs from "node:fs/promises";
import path from "node:path";

export async function getChangelog(): Promise<string> {
  const file = path.join(process.cwd(), "docs/CHANGELOG.md");
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}
