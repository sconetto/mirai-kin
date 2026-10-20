export class ApiError extends Error {
  status: number;
  code: string;
  fields?: string[];

  constructor(status: number, code: string, message: string, fields?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } },
      { status: error.status },
    );
  }

  console.error("[api] unhandled error", error);
  return Response.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    { status: 500 },
  );
}

export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
