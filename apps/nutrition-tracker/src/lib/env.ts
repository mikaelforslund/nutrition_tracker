import "server-only";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),

    AUTH_MODE: z.enum(["mock", "supabase"]),
    ALLOW_MOCK_AUTH: z.enum(["true", "false"]).default("false"),
    MOCK_USER_ID: z.uuid().default("00000000-0000-4000-8000-000000000001"),

    SUPABASE_URL: z.url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_JWT_SECRET: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
    STORAGE_BUCKET: z.string().min(1).default("nutrition-uploads"),
    UPLOAD_DIR: z.string().min(1).default(".data/uploads"),

    ENABLE_DB_VIEWER: z.enum(["true", "false"]).default("false"),

    VISION_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
    VISION_BASE_URL: z.url().default("http://localhost:11434/v1"),
    VISION_MODEL: z.string().min(1).default("qwen3.5:9b"),
    VISION_API_KEY: z.string().min(1).optional(),
    VISION_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
    VISION_MAX_IMAGE_PX: z.coerce.number().int().positive().default(512),
    MOCK_VISION_LATENCY_MS: z.coerce.number().int().min(0).default(1000),
    VISION_ALLOWED_IMAGE_HOSTS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((host) => host.trim().toLowerCase())
          .filter(Boolean),
      ),
  })
  .superRefine((env, ctx) => {
    if (env.AUTH_MODE === "mock" && env.NODE_ENV === "production" && env.ALLOW_MOCK_AUTH !== "true") {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_MODE"],
        message: "mock auth is refused in production unless ALLOW_MOCK_AUTH=true",
      });
    }
    if (env.AUTH_MODE === "supabase" && (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY)) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_MODE"],
        message: "SUPABASE_URL and SUPABASE_ANON_KEY are required when AUTH_MODE=supabase",
      });
    }
    if (env.STORAGE_DRIVER === "supabase" && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_DRIVER"],
        message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_DRIVER=supabase",
      });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parsed lazily so `next build` doesn't need runtime configuration. */
export function getEnv(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}

export function resetEnvForTests(): void {
  cached = undefined;
}
