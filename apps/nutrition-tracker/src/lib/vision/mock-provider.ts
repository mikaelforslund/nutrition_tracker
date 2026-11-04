import { createHash } from "node:crypto";
import type { NutritionResult } from "./contract";
import type { VisionInput, VisionProvider } from "./provider";

type Plate = Omit<NutritionResult, "confidence">;

const PLATES: readonly [Plate, ...Plate[]] = [
  { foodName: "Grilled Salmon with Quinoa", calories: 550, proteinG: 45, carbsG: 40, fatG: 23 },
  { foodName: "Chicken Burrito Bowl", calories: 680, proteinG: 46, carbsG: 72, fatG: 21 },
  { foodName: "Avocado Toast with Poached Egg", calories: 420, proteinG: 17, carbsG: 34, fatG: 25 },
  { foodName: "Beef Stir-Fry with Rice", calories: 640, proteinG: 38, carbsG: 74, fatG: 20 },
  { foodName: "Greek Salad with Feta", calories: 340, proteinG: 12, carbsG: 16, fatG: 26 },
  { foodName: "Tofu Poke Bowl", calories: 510, proteinG: 24, carbsG: 66, fatG: 16 },
];

function digest(input: VisionInput): Buffer {
  const hash = createHash("sha256");
  hash.update(input.kind === "bytes" ? input.bytes : input.url);
  return hash.digest();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Stands in for vLLM. The image's hash picks the plate, so the same photo always
 * gives the same answer. No image content is actually inspected.
 */
export function createMockVisionProvider(options: { latencyMs: number }): VisionProvider {
  return {
    model: "mock-vllm-vision-v1",

    async analyze(task, input, signal) {
      await sleep(options.latencyMs, signal);

      const hash = digest(input);
      const plate = PLATES[hash.readUInt32BE(0) % PLATES.length] ?? PLATES[0];
      const confidence = 0.82 + (hash.readUInt8(4) % 16) / 100;

      return { task, result: { ...plate, confidence } };
    },
  };
}
