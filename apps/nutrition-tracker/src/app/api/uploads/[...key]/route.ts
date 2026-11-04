import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { parseUploadKey } from "@/lib/storage/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const mockAuth = getEnv().AUTH_MODE === "mock";
  const user = await getCurrentUser();
  if (!user && !mockAuth) return new Response(null, { status: 401 });

  const key = (await params).key.join("/");
  const parsed = parseUploadKey(key);

  // Mock mode's session view shows other people's dashboards, including photos.
  const canRead = mockAuth || parsed?.ownerId === user?.id;

  // Other users' files return 404 so the response doesn't confirm they exist.
  if (!parsed || !canRead) return new Response(null, { status: 404 });

  const bytes = await getStorage().get(key);
  if (!bytes) return new Response(null, { status: 404 });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": parsed.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
