// Shared homework helpers (audit + notification fan-out). Used from client.
import { supabase } from "@/integrations/supabase/client";

export type HwAttachment = { path: string; name: string; size?: number };

export async function audit(action: string, entity_id: string | null, meta: Record<string, unknown> = {}) {
  try {
    await supabase.rpc("log_audit", {
      _action: action, _entity: "homework",
      _entity_id: entity_id ?? undefined,
      _meta: meta as never,
    });
  } catch { /* swallow */ }
}

export async function notifyHomeworkAssigned(homeworkId: string, sectionId: string | null, title: string, schoolId: string | null) {
  if (!sectionId) return;
  const { data: students } = await supabase
    .from("students").select("user_id").eq("section_id", sectionId).not("user_id", "is", null);
  if (!students?.length) return;
  await Promise.all(students.map((s) =>
    s.user_id && supabase.rpc("create_notification", {
      _user_id: s.user_id, _kind: "homework",
      _title: "New homework assigned",
      _body: title,
      _school_id: schoolId ?? undefined,
    })
  ));
  await audit("homework.assigned", homeworkId, { section_id: sectionId });
}

export async function uploadHomeworkAttachment(bucket: "assignments", schoolId: string, file: File): Promise<HwAttachment> {
  const path = `${schoolId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, name: file.name, size: file.size };
}

export async function getSignedUrl(bucket: "assignments", path: string) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "#";
}
