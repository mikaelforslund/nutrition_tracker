import { describe, expect, it } from "vitest";
import { baseUrlSchema, parseModelList, visionSettingsInputSchema } from "./settings";

const form = {
  provider: "openai",
  baseUrl: "http://localhost:11434/v1/",
  model: " qwen3.5:9b ",
  apiKey: "",
};

describe("visionSettingsInputSchema", () => {
  it("tidies the values", () => {
    expect(visionSettingsInputSchema.parse(form)).toMatchObject({
      baseUrl: "http://localhost:11434/v1",
      model: "qwen3.5:9b",
    });
  });

  it.each([
    ["an unknown provider", { ...form, provider: "other" }],
    ["no model", { ...form, model: " " }],
    ["no URL", { ...form, baseUrl: "" }],
  ])("rejects %s", (_name, input) => {
    expect(visionSettingsInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("baseUrlSchema", () => {
  it.each(["file:///etc/passwd", "ftp://example.com", "javascript:alert(1)", "not a url"])(
    "rejects %s",
    (url) => {
      expect(baseUrlSchema.safeParse(url).success).toBe(false);
    },
  );

  it("accepts http and https", () => {
    expect(baseUrlSchema.safeParse("https://api.example.com/v1").success).toBe(true);
  });
});

describe("parseModelList", () => {
  it("reads and sorts model names", () => {
    expect(parseModelList({ data: [{ id: "b" }, { id: "a" }] })).toEqual(["a", "b"]);
  });

  it("rejects other shapes", () => {
    expect(parseModelList({ models: [] })).toBeNull();
    expect(parseModelList("nope")).toBeNull();
  });
});
