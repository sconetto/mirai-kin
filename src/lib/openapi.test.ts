import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./openapi";

describe("OpenAPI contract", () => {
  const document = buildOpenApiDocument();
  const paths = document.paths ?? {};

  it("is an OpenAPI 3.1 document", () => {
    expect(document.openapi).toBe("3.1.0");
  });

  it("covers the core and transfer endpoints", () => {
    expect(paths["/api/v1/transactions"]).toBeTruthy();
    expect(paths["/api/v1/accounts"]).toBeTruthy();
    expect(paths["/api/v1/plan-status"]).toBeTruthy();
    expect(paths["/api/v1/scenarios"]).toBeTruthy();
    expect(paths["/api/v1/scenarios/compare"]).toBeTruthy();
    expect(paths["/api/v1/scenarios/{id}"]).toBeTruthy();
    expect(paths["/api/v1/reports"]).toBeUndefined();
    expect(paths["/api/v1/transfers"]).toBeTruthy();
    expect(paths["/api/v1/transfers/pair"]).toBeTruthy();
  });

  it("registers component schemas", () => {
    expect(document.components?.schemas?.AccountInput).toBeTruthy();
    expect(document.components?.schemas?.TransactionInput).toBeTruthy();
    expect(document.components?.schemas?.TransferInput).toBeTruthy();
    expect(document.components?.schemas?.ScenarioInput).toBeTruthy();
    expect(document.components?.schemas?.ScenarioUpdate).toBeTruthy();
    expect(document.components?.securitySchemes?.bearerAuth).toBeTruthy();
  });
});
