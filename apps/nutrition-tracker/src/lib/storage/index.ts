import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "../env";

export type ObjectStorage = {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
};

function createLocalStorage(root: string): ObjectStorage {
  return {
    async put(key, bytes) {
      const target = path.join(root, key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    },
    async get(key) {
      try {
        return await readFile(path.join(root, key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      await rm(path.join(root, key), { force: true });
    },
  };
}

export function createSupabaseStorage(config: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
}): ObjectStorage {
  const base = `${config.supabaseUrl}/storage/v1/object`;
  const auth = {
    Authorization: `Bearer ${config.serviceRoleKey}`,
    apikey: config.serviceRoleKey,
  };

  return {
    async put(key, bytes, contentType) {
      const response = await fetch(`${base}/${config.bucket}/${key}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": contentType },
        body: Buffer.from(bytes),
      });
      if (!response.ok) {
        throw new Error(`Supabase Storage upload failed with status ${response.status}`);
      }
    },
    async get(key) {
      const response = await fetch(`${base}/authenticated/${config.bucket}/${key}`, {
        headers: auth,
      });
      // Supabase Storage reports a missing object as either 400 or 404.
      if (response.status === 400 || response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Supabase Storage download failed with status ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    async delete(key) {
      const response = await fetch(`${base}/${config.bucket}/${key}`, {
        method: "DELETE",
        headers: auth,
      });
      if (!response.ok && response.status !== 400 && response.status !== 404) {
        throw new Error(`Supabase Storage delete failed with status ${response.status}`);
      }
    },
  };
}

export function getStorage(): ObjectStorage {
  const env = getEnv();

  if (env.STORAGE_DRIVER === "supabase") {
    return createSupabaseStorage({
      // Guaranteed by env validation when STORAGE_DRIVER=supabase.
      supabaseUrl: env.SUPABASE_URL!,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!,
      bucket: env.STORAGE_BUCKET,
    });
  }

  return createLocalStorage(path.resolve(env.UPLOAD_DIR));
}
