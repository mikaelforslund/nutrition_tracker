import sharp from "sharp";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createOpenAiVisionProvider } from "./openai-provider";
import { ImageNotRecognizedError } from "./provider";

const config = {
  baseUrl: "http://ollama.test/v1",
  model: "qwen3.5:9b",
  timeoutMs: 1000,
  maxImageDimension: 512,
};

let input: { kind: "bytes"; bytes: Uint8Array; mimeType: string };

beforeAll(async () => {
  const bytes = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#884422" },
  })
    .jpeg()
    .toBuffer();
  input = { kind: "bytes", bytes, mimeType: "image/jpeg" };
});

const meal = {
  isFood: true,
  foodName: "Burger",
  proteinG: 28,
  carbsG: 45,
  fatG: 32,
  confidence: 0.95,
};

function stubCompletion(content: string, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json({ choices: [{ message: { content } }] }, { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("OpenAI-compatible vision provider", () => {
  afterEach(() => vi.unstubAllGlobals());

  const provider = createOpenAiVisionProvider(config);

  it("sends the image and schema, and maps the answer to the contract", async () => {
    const fetchMock = stubCompletion(JSON.stringify(meal));

    const analysis = await provider.analyze("NUTRITION", input);

    expect(analysis).toEqual({
      task: "NUTRITION",
      result: {
        foodName: "Burger",
        calories: 580,
        proteinG: 28,
        carbsG: 45,
        fatG: 32,
        confidence: 0.95,
      },
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(url).toBe("http://ollama.test/v1/chat/completions");
    expect(body.model).toBe("qwen3.5:9b");
    expect(body.response_format.type).toBe("json_schema");

    const sent: string = body.messages[0].content[1].image_url.url;
    expect(sent.startsWith("data:image/jpeg;base64,")).toBe(true);
    const metadata = await sharp(Buffer.from(sent.split(",")[1]!, "base64")).metadata();
    expect([metadata.width, metadata.height]).toEqual([512, 256]);
  });

  it("only sends an API key when one is configured", async () => {
    const fetchMock = stubCompletion(JSON.stringify(meal));

    await provider.analyze("NUTRITION", input);
    await createOpenAiVisionProvider({ ...config, apiKey: "key" }).analyze("NUTRITION", input);

    expect(fetchMock.mock.calls[0]![1].headers).not.toHaveProperty("Authorization");
    expect(fetchMock.mock.calls[1]![1].headers).toHaveProperty("Authorization", "Bearer key");
  });

  it("reports photos that aren't food", async () => {
    stubCompletion(JSON.stringify({ ...meal, isFood: false }));
    await expect(provider.analyze("NUTRITION", input)).rejects.toBeInstanceOf(ImageNotRecognizedError);
  });

  it("treats an undecodable image as not recognized, without calling the model", async () => {
    const fetchMock = stubCompletion(JSON.stringify(meal));
    const corrupt = { ...input, bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]) };

    await expect(provider.analyze("NUTRITION", corrupt)).rejects.toBeInstanceOf(ImageNotRecognizedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails on a backend error", async () => {
    stubCompletion("{}", 500);
    await expect(provider.analyze("NUTRITION", input)).rejects.toThrow("status 500");
  });

  it("fails on output that isn't valid JSON or misses fields", async () => {
    stubCompletion("not json");
    await expect(provider.analyze("NUTRITION", input)).rejects.toThrow();

    stubCompletion(JSON.stringify({ isFood: true }));
    await expect(provider.analyze("NUTRITION", input)).rejects.toThrow();
  });
});
