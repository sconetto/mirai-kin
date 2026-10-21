import { getSession } from "@/lib/auth";
import { readBackupFile } from "@/services/backups";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const result = await readBackupFile(id);
  if (!result) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(result.data), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${result.row.filename}"`,
      "cache-control": "no-store",
    },
  });
}
