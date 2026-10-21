import { getSession } from "@/lib/auth";
import { createFullExport } from "@/services/export";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const data = await createFullExport();
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="mirai-kin-export-${new Date()
        .toISOString()
        .slice(0, 10)}.zip"`,
      "cache-control": "no-store",
    },
  });
}
