import { buildOpenApiDocument } from "@/lib/openapi";

export async function GET() {
  return Response.json(buildOpenApiDocument());
}
