import { z } from "zod";
import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson, parseQuery } from "@/lib/api/validate";
import { categoryCreateSchema } from "@/lib/schemas";
import { createCategory, listCategories } from "@/services/categories";

const querySchema = z.object({ type: z.enum(["income", "expense"]).optional() });

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const query = parseQuery(request, querySchema);
    return jsonOk(await listCategories(query.type));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, categoryCreateSchema);
    return withIdempotency(request, "categories.create", body, async () => {
      const category = await createCategory(body);
      return { status: 201, body: category };
    });
  });
}
