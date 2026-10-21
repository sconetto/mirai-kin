import { assertApiToken } from "@/lib/api/auth";
import { handle } from "@/lib/api/validate";
import { createFullExport } from "@/services/export";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
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
  });
}
