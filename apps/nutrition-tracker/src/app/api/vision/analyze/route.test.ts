import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { MAX_IMAGE_BYTES, visionResponseSchema } from "@/lib/vision/contract";
import { POST } from "./route";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

// Saved settings live in the database, so these tests use the environment alone.
vi.mock("@/lib/app-settings", () => ({
  getVisionSettings: async () => ({
    provider: process.env.VISION_PROVIDER ?? "mock",
    baseUrl: "http://vision.test/v1",
    model: "test-model",
  }),
}));

const USER_ID = "00000000-0000-4000-8000-000000000001";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const URL_ENDPOINT = "http://localhost/api/vision/analyze";

function multipart(fields: Record<string, string | File>) {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  return new Request(URL_ENDPOINT, { method: "POST", body, headers: { "content-length": "1000" } });
}

function json(body: unknown) {
  return new Request(URL_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function send(request: Request) {
  const response = await POST(request);
  return { status: response.status, body: visionResponseSchema.parse(await response.json()) };
}

describe("POST /api/vision/analyze", () => {
  let uploadDir: string;

  beforeAll(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), "analyze-test-"));
  });

  afterAll(async () => {
    await rm(uploadDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://unused");
    vi.stubEnv("AUTH_MODE", "mock");
    vi.stubEnv("MOCK_USER_ID", USER_ID);
    vi.stubEnv("MOCK_VISION_LATENCY_MS", "0");
    vi.stubEnv("UPLOAD_DIR", uploadDir);
    vi.stubEnv("VISION_ALLOWED_IMAGE_HOSTS", "images.example.com");
    resetEnvForTests();
  });

  it("analyzes an uploaded file and stores it under the user", async () => {
    const { status, body } = await send(
      multipart({ task: "NUTRITION", image: new File([JPEG], "meal.jpg") }),
    );

    expect(status).toBe(200);
    if (!body.ok) throw new Error("expected success");
    expect(body.analysis.task).toBe("NUTRITION");
    expect(body.imageUrl).toMatch(new RegExp(`^/api/uploads/${USER_ID}/.+\\.jpg$`));
  });

  it("analyzes an allowed URL sent as JSON", async () => {
    const imageUrl = "https://images.example.com/meal.jpg";
    const { status, body } = await send(json({ task: "NUTRITION", imageUrl }));

    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, imageUrl });
  });

  it("refuses URLs outside the allowlist", async () => {
    const { status, body } = await send(
      json({ task: "NUTRITION", imageUrl: "https://169.254.169.254/latest/meta-data" }),
    );

    expect(status).toBe(422);
    expect(body).toMatchObject({ ok: false, error: { code: "IMAGE_HOST_NOT_ALLOWED" } });
  });

  it("identifies files by content, not by their claimed type", async () => {
    const svg = new File(["<svg onload=alert(1)>"], "meal.jpg", { type: "image/jpeg" });
    const { status, body } = await send(multipart({ task: "NUTRITION", image: svg }));

    expect(status).toBe(415);
    expect(body).toMatchObject({ ok: false, error: { code: "UNSUPPORTED_MEDIA_TYPE" } });
  });

  it("rejects an unknown task", async () => {
    const { status } = await send(json({ task: "ASTROLOGY", imageUrl: "https://images.example.com/a.jpg" }));
    expect(status).toBe(400);
  });

  it("requires exactly one image source", async () => {
    const image = new File([JPEG], "meal.jpg");
    const both = await send(
      multipart({ task: "NUTRITION", image, imageUrl: "https://images.example.com/a.jpg" }),
    );
    const neither = await send(multipart({ task: "NUTRITION" }));

    expect(both.status).toBe(400);
    expect(neither.status).toBe(400);
  });

  it("rejects oversized bodies before reading them", async () => {
    const request = multipart({ task: "NUTRITION", image: new File([JPEG], "meal.jpg") });
    request.headers.set("content-length", String(MAX_IMAGE_BYTES * 2));

    const { status, body } = await send(request);
    expect(status).toBe(413);
    expect(body).toMatchObject({ ok: false, error: { code: "IMAGE_TOO_LARGE" } });
  });

  it("reports a non-food photo without storing it", async () => {
    vi.stubEnv("VISION_PROVIDER", "openai");
    resetEnvForTests();
    const content = JSON.stringify({
      isFood: false,
      foodName: "",
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      confidence: 0.99,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ choices: [{ message: { content } }] })),
    );

    const photo = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#336699" },
    })
      .jpeg()
      .toBuffer();

    const before = await readdir(uploadDir, { recursive: true });
    const { status, body } = await send(
      multipart({ task: "NUTRITION", image: new File([new Uint8Array(photo)], "bridge.jpg") }),
    );
    vi.unstubAllGlobals();

    expect(status).toBe(422);
    expect(body).toMatchObject({ ok: false, error: { code: "IMAGE_NOT_RECOGNIZED" } });
    expect(await readdir(uploadDir, { recursive: true })).toEqual(before);
  });

  it("rejects other content types", async () => {
    const { status } = await send(
      new Request(URL_ENDPOINT, { method: "POST", headers: { "content-type": "text/plain" }, body: "hi" }),
    );
    expect(status).toBe(415);
  });
});
