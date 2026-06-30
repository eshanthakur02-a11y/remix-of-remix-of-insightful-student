// Super-admin helper server functions for Wave 2 completion.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function cryptoRandomPassword(len = 14) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56]).join("");
}

async function assertSuperAdmin(context: any) {
  const { data } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
  if (!data) throw new Error("Forbidden: super_admin only");
}
async function audit(context: any, action: string, entity: string, id: string | null, meta: Record<string, unknown> = {}, school_id: string | null = null) {
  try {
    await context.supabase.rpc("log_audit", { _action: action, _entity: entity, _entity_id: id, _school_id: school_id, _meta: meta });
  } catch { /* swallow */ }
}

// Update a school's profile fields
export const updateSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    school_id: z.string().uuid(),
    patch: z.object({
      name: z.string().min(1).optional(),
      code: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("schools").update(data.patch).eq("id", data.school_id);
    if (error) throw error;
    await audit(context, "school.updated", "school", data.school_id, data.patch, data.school_id);
    return { ok: true };
  });

// Delete a school (super admin)
export const deleteSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ school_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("schools").delete().eq("id", data.school_id);
    if (error) throw error;
    await audit(context, "school.deleted", "school", data.school_id, {}, data.school_id);
    return { ok: true };
  });

// Replace the whole features object for a school
export const updateSchoolFeatures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ school_id: z.string().uuid(), features: z.record(z.string(), z.boolean()) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("schools").update({ features: data.features }).eq("id", data.school_id);
    if (error) throw error;
    await audit(context, "school.features_updated", "school", data.school_id, data.features, data.school_id);
    return { ok: true };
  });

// Suspend / activate a school admin (or any user) by id
export const setUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), suspended: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles")
      .update({ status: data.suspended ? "suspended" : "active" })
      .eq("id", data.user_id);
    if (error) throw error;
    await audit(context, data.suspended ? "user.suspended" : "user.activated", "user", data.user_id);
    return { ok: true };
  });

// Reset password for any user (super admin)
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pw = cryptoRandomPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: pw });
    if (error) throw error;
    await audit(context, "user.password_reset", "user", data.user_id);
    return { tempPassword: pw };
  });

// Delete a user (super admin) — deletes auth user + cascades profile/role
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw error;
    await audit(context, "user.deleted", "user", data.user_id);
    return { ok: true };
  });
