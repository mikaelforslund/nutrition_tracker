import type { VisionAnalysis, VisionTask } from "./contract";

export type VisionInput =
  | { kind: "bytes"; bytes: Uint8Array; mimeType: string }
  | { kind: "url"; url: string };

/** The model looked at the image and found nothing it can analyze for this task. */
export class ImageNotRecognizedError extends Error {}

/** The seam for an inference backend. */
export type VisionProvider = {
  readonly model: string;
  analyze(task: VisionTask, input: VisionInput, signal?: AbortSignal): Promise<VisionAnalysis>;
};
