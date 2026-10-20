import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { categoryUpdateSchema } from "@/lib/schemas";
import { deleteCategory, updateCategory } from "@/services/categories";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, categoryUpdateSchema);
    const category = await updateCategory(id, body);
    if (!category) throw new ApiError(404, "not_found", "Category not found");
    return jsonOk(category);
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    try {
      const category = await deleteCategory(id);
      if (!category) throw new ApiError(404, "not_found", "Category not found");
      return jsonOk(category);
    } catch (error) {
      if (error instanceof Error && error.name === "CategoryInUseError") {
        throw new ApiError(409, "category_in_use", error.message);
      }
      throw error;
    }
  });
}
