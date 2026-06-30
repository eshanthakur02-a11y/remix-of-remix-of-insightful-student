import { supabase } from "@/integrations/supabase/client";

export type BucketName = "avatars" | "school-logos" | "documents" | "assignments" | "report-cards" | "fee-receipts";

export async function uploadFile(bucket: BucketName, path: string, file: File, opts?: { upsert?: boolean }) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: opts?.upsert ?? true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return data.path;
}

export async function getSignedUrl(bucket: BucketName, path: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function removeFile(bucket: BucketName, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}

/** Build a school-scoped folder path: `<school_id>/<...rest>`. Required for buckets with school-scoped RLS. */
export function schoolPath(schoolId: string, ...rest: string[]) {
  return [schoolId, ...rest].filter(Boolean).join("/");
}

/** Build a per-user avatar path: `<user_id>/<filename>`. */
export function avatarPath(userId: string, filename: string) {
  return `${userId}/${filename}`;
}
