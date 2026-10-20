import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { z } from "@/lib/zod";
import {
  accountCreateSchema,
  accountUpdateSchema,
  budgetCreateSchema,
  budgetUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  csvImportSchema,
  debtCreateSchema,
  debtUpdateSchema,
  investmentPositionCreateSchema,
  investmentPositionUpdateSchema,
  investmentPriceCreateSchema,
  labelCreateSchema,
  labelUpdateSchema,
  transactionBatchSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
} from "@/lib/schemas";

const genericEntity = z.record(z.string(), z.unknown());
const genericList = z.array(genericEntity);
const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.array(z.string()).optional(),
  }),
});

const json = (schema: z.ZodType) => ({ "application/json": { schema } });
const ok = (schema: z.ZodType) => ({ description: "OK", content: json(schema) });
const created = (schema: z.ZodType) => ({ description: "Created", content: json(schema) });
const badRequest = { description: "Validation error", content: json(errorSchema) };
const unauthorized = { description: "Unauthorized", content: json(errorSchema) };

const security = [{ bearerAuth: [] }];

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.register("Error", errorSchema);
  registry.register("AccountInput", accountCreateSchema);
  registry.register("AccountUpdate", accountUpdateSchema);
  registry.register("TransactionInput", transactionCreateSchema);
  registry.register("TransactionBatch", transactionBatchSchema);
  registry.register("TransactionUpdate", transactionUpdateSchema);
  registry.register("CategoryInput", categoryCreateSchema);
  registry.register("CategoryUpdate", categoryUpdateSchema);
  registry.register("LabelInput", labelCreateSchema);
  registry.register("LabelUpdate", labelUpdateSchema);
  registry.register("BudgetInput", budgetCreateSchema);
  registry.register("BudgetUpdate", budgetUpdateSchema);
  registry.register("InvestmentPositionInput", investmentPositionCreateSchema);
  registry.register("InvestmentPositionUpdate", investmentPositionUpdateSchema);
  registry.register("InvestmentPriceInput", investmentPriceCreateSchema);
  registry.register("DebtInput", debtCreateSchema);
  registry.register("DebtUpdate", debtUpdateSchema);
  registry.register("CsvImportInput", csvImportSchema);

  const idParams = z.object({ id: z.uuid() });

  // Accounts
  registry.registerPath({
    method: "get",
    path: "/api/v1/accounts",
    tags: ["accounts"],
    security,
    responses: { 200: ok(genericList), 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/accounts",
    tags: ["accounts"],
    security,
    request: { body: { content: json(accountCreateSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/accounts/{id}",
    tags: ["accounts"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/accounts/{id}",
    tags: ["accounts"],
    security,
    request: { params: idParams, body: { content: json(accountUpdateSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/accounts/{id}",
    tags: ["accounts"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });

  // Categories
  registry.registerPath({
    method: "get",
    path: "/api/v1/categories",
    tags: ["categories"],
    security,
    responses: { 200: ok(genericList), 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/categories",
    tags: ["categories"],
    security,
    request: { body: { content: json(categoryCreateSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/categories/{id}",
    tags: ["categories"],
    security,
    request: { params: idParams, body: { content: json(categoryUpdateSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/categories/{id}",
    tags: ["categories"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });

  // Labels
  registry.registerPath({
    method: "get",
    path: "/api/v1/labels",
    tags: ["labels"],
    security,
    responses: { 200: ok(genericList), 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/labels",
    tags: ["labels"],
    security,
    request: { body: { content: json(labelCreateSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/labels/{id}",
    tags: ["labels"],
    security,
    request: { params: idParams, body: { content: json(labelUpdateSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/labels/{id}",
    tags: ["labels"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });

  // Transactions
  registry.registerPath({
    method: "get",
    path: "/api/v1/transactions",
    tags: ["transactions"],
    security,
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/transactions",
    tags: ["transactions"],
    security,
    request: { body: { content: json(transactionBatchSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/transactions/{id}",
    tags: ["transactions"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/transactions/{id}",
    tags: ["transactions"],
    security,
    request: { params: idParams, body: { content: json(transactionUpdateSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/transactions/{id}",
    tags: ["transactions"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });

  // Budgets
  registry.registerPath({
    method: "get",
    path: "/api/v1/budgets",
    tags: ["budgets"],
    security,
    responses: { 200: ok(genericList), 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/budgets",
    tags: ["budgets"],
    security,
    request: { body: { content: json(budgetCreateSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/budgets/{id}",
    tags: ["budgets"],
    security,
    request: { params: idParams, body: { content: json(budgetUpdateSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/budgets/{id}",
    tags: ["budgets"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });

  // Investments
  registry.registerPath({
    method: "get",
    path: "/api/v1/investments",
    tags: ["investments"],
    security,
    responses: { 200: ok(genericList), 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/investments",
    tags: ["investments"],
    security,
    request: { body: { content: json(investmentPositionCreateSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/investments/{id}",
    tags: ["investments"],
    security,
    request: { params: idParams, body: { content: json(investmentPositionUpdateSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/investments/{id}/prices",
    tags: ["investments"],
    security,
    request: { params: idParams, body: { content: json(investmentPriceCreateSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });

  // Debts
  registry.registerPath({
    method: "get",
    path: "/api/v1/debts",
    tags: ["debts"],
    security,
    responses: { 200: ok(genericList), 401: unauthorized },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/debts",
    tags: ["debts"],
    security,
    request: { body: { content: json(debtCreateSchema) } },
    responses: { 201: created(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/debts/{id}",
    tags: ["debts"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/debts/{id}",
    tags: ["debts"],
    security,
    request: { params: idParams, body: { content: json(debtUpdateSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/debts/{id}",
    tags: ["debts"],
    security,
    request: { params: idParams },
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });

  // Projections
  registry.registerPath({
    method: "get",
    path: "/api/v1/projections",
    tags: ["projections"],
    security,
    responses: { 200: ok(genericEntity), 401: unauthorized },
  });

  // Import
  registry.registerPath({
    method: "post",
    path: "/api/v1/import/csv",
    tags: ["import"],
    security,
    request: { body: { content: json(csvImportSchema) } },
    responses: { 200: ok(genericEntity), 400: badRequest, 401: unauthorized },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const document = generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Finance Planner API",
      version: "1.0.0",
      description:
        "Self-hosted finance planner API. All endpoints require a bearer token (API_TOKEN). Mutating endpoints accept an `Idempotency-Key` header.",
    },
    servers: [{ url: "/" }],
  });

  return {
    ...document,
    components: {
      ...document.components,
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
  };
}
