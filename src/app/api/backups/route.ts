import { getSession } from "@/lib/auth";
import { runBackup } from "@/services/backups";

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const backup = await runBackup();
  return Response.json({ backup });
}
