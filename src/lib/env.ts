import { z } from "zod";

function emptyToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema);
}

const EnvSchema = z.object({
  DATABASE_URL: emptyToUndefined(z.string().min(1).optional()),
  AUTH_USERNAME: emptyToUndefined(z.string().min(1).default("admin")),
  AUTH_PASSWORD: emptyToUndefined(z.string().min(1).default("admin")),
  AUTH_PASSWORD_HASH: emptyToUndefined(z.string().min(1).optional()),
  AUTH_SECRET: z.string().min(16).default("dev-insecure-secret-change-me"),
  API_TOKEN: emptyToUndefined(z.string().min(1).optional()),
  BASE_CURRENCY: z.string().min(3).max(3).default("BRL"),
  FX_SOURCE_URL: z.string().min(1).default("https://api.frankfurter.app"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = EnvSchema.parse(process.env);
  }
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
