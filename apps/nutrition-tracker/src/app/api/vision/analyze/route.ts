import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getActingUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { createUploadKey, uploadUrl } from "@/lib/storage/keys";
import { getVisionProvider } from "@/lib/vision";
import {
  MAX_IMAGE_BYTES,
  VISION_ERROR_CODES,
  visionAnalysisSchema,
  visionTaskSchema,
  type VisionResponse,
  type VisionTask,
} from "@/lib/vision/contract";
import { isAllowedImageUrl, sniffImageFormat, type ImageFormat } from "@/lib/vision/image";
import { ImageNotRecognizedError, type VisionInput } from "@/lib/vision/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Room for multipart boundaries and the other form fields. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

type ErrorCode = (typeof VISION_ERROR_CODES)[number];

class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

type ParsedRequest =
  | { task: VisionTask; source: "file"; bytes: Uint8Array; format: ImageFormat }
  | { task: VisionTask; source: "url"; url: string };

const jsonBodySchema = z.object({ task: visionTaskSchema, imageUrl: z.string() });

function parseTask(value: unknown): VisionTask {
  const task = visionTaskSchema.safeParse(value);
  if (!task.success) {
    throw new RequestError(400, "INVALID_REQUEST", "task is missing or not supported.");
  }
  return task.data;
}

function assertAllowedUrl(url: string): void {
  if (!isAllowedImageUrl(url, getEnv().VISION_ALLOWED_IMAGE_HOSTS)) {
    throw new RequestError(422, "IMAGE_HOST_NOT_ALLOWED", "imageUrl is not an allowed image location.");
  }
}

async function parseMultipart(request: Request): Promise<ParsedRequest> {
  // formData() buffers the whole body, so reject oversized requests first.
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) {
    throw new RequestError(411, "LENGTH_REQUIRED", "Content-Length is required.");
  }
  if (Number(contentLength) > MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES) {
    throw new RequestError(413, "IMAGE_TOO_LARGE", "Image exceeds the 8 MB limit.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new RequestError(400, "INVALID_REQUEST", "Request body is not valid multipart data.");
  }

  const task = parseTask(form.get("task"));
  const image = form.get("image");
  const imageUrl = form.get("imageUrl");

  if (image instanceof File === (typeof imageUrl === "string")) {
    throw new RequestError(400, "INVALID_REQUEST", "Provide exactly one of image or imageUrl.");
  }

  if (typeof imageUrl === "string") {
    assertAllowedUrl(imageUrl);
    return { task, source: "url", url: imageUrl };
  }

  const file = image as File;
  if (file.size > MAX_IMAGE_BYTES) {
    throw new RequestError(413, "IMAGE_TOO_LARGE", "Image exceeds the 8 MB limit.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = sniffImageFormat(bytes);
  if (!format) {
    throw new RequestError(415, "UNSUPPORTED_MEDIA_TYPE", "Image must be a JPEG, PNG, or WebP.");
  }

  return { task, source: "file", bytes, format };
}

async function parseJson(request: Request): Promise<ParsedRequest> {
  const body = jsonBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    throw new RequestError(400, "INVALID_REQUEST", "Body must include a valid task and imageUrl.");
  }

  assertAllowedUrl(body.data.imageUrl);
  return { task: body.data.task, source: "url", url: body.data.imageUrl };
}

function parseRequest(request: Request): Promise<ParsedRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.startsWith("multipart/form-data")) return parseMultipart(request);
  if (contentType.startsWith("application/json")) return parseJson(request);

  throw new RequestError(
    415,
    "UNSUPPORTED_MEDIA_TYPE",
    "Use multipart/form-data or application/json.",
  );
}

function respond(body: VisionResponse, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    const user = await getActingUser(request.headers.get("x-act-as") ?? undefined);
    if (!user) {
      throw new RequestError(401, "UNAUTHENTICATED", "Sign in to analyze images.");
    }

    const parsed = await parseRequest(request);
    const input: VisionInput =
      parsed.source === "file"
        ? { kind: "bytes", bytes: parsed.bytes, mimeType: parsed.format.mimeType }
        : { kind: "url", url: parsed.url };

    const provider = await getVisionProvider();
    const raw = await provider.analyze(parsed.task, input, request.signal);

    // Model output is untrusted: it must match the contract before it's returned.
    const analysis = visionAnalysisSchema.parse(raw);

    let imageUrl: string;
    if (parsed.source === "file") {
      const key = createUploadKey(user.id, parsed.format.extension);
      await getStorage().put(key, parsed.bytes, parsed.format.mimeType);
      imageUrl = uploadUrl(key);
    } else {
      imageUrl = parsed.url;
    }

    return respond({ ok: true, requestId, model: provider.model, imageUrl, analysis }, 200);
  } catch (error) {
    if (error instanceof RequestError) {
      return respond(
        { ok: false, requestId, error: { code: error.code, message: error.message } },
        error.status,
      );
    }

    if (error instanceof ImageNotRecognizedError) {
      return respond(
        {
          ok: false,
          requestId,
          error: { code: "IMAGE_NOT_RECOGNIZED", message: "That photo doesn't look like food." },
        },
        422,
      );
    }

    // A caller who cancelled isn't a failure worth logging.
    if (!request.signal.aborted) {
      console.error(`vision analyze failed (request ${requestId})`, error);
    }
    return respond(
      {
        ok: false,
        requestId,
        error: { code: "INFERENCE_FAILED", message: "The image couldn't be analyzed." },
      },
      502,
    );
  }
}
