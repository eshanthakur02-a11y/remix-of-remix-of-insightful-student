// Admin-driven user-creation server functions.
// All functions require an authenticated caller with the appropriate role.
// Service-role admin client is loaded inside handlers only (never top-level)
// so this file is safe to import from client-reachable route modules.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Super Admin: create a School Admin --------------------------------

export const createSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      school_id: z.string().uuid(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Caller must be super_admin.
    const { data: isSuper } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
    if (!isSuper) throw new Error("Forbidden: super_admin only");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: "school_admin", school_id: data.school_id },
    });
    if (error) throw error;
    return { id: created.user?.id };
  });

// ---------- School Admin: create staff (teacher / accountant / transport) -----

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["teacher", "accountant", "transport"]),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "school_admin",
    });
    if (!isAdmin) throw new Error("Forbidden: school admin only");

    const { data: schoolId } = await context.supabase.rpc("get_user_school", { _user_id: context.userId });
    if (!schoolId) throw new Error("Your account is not assigned to a school");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: data.role, school_id: schoolId },
    });
    if (error) throw error;
    return { id: created.user?.id };
  });

// ---------- School Admin: create a student and link/create parent -------------

export const createStudentWithParent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      // student
      student_full_name: z.string().min(1),
      admission_no: z.string().min(1),
      class_id: z.string().uuid().optional().nullable(),
      section_id: z.string().uuid().optional().nullable(),
      // optional student login
      student_email: z.string().email().optional().nullable(),
      student_password: z.string().min(8).optional().nullable(),
      // parent
      parent_full_name: z.string().min(1),
      parent_email: z.string().email(),
      parent_phone: z.string().optional().nullable(),
      parent_password: z.string().min(8).optional().nullable(),
      relationship: z.string().optional().nullable(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "school_admin",
    });
    if (!isAdmin) throw new Error("Forbidden: school admin only");

    const { data: schoolId } = await context.supabase.rpc("get_user_school", { _user_id: context.userId });
    if (!schoolId) throw new Error("Your account is not assigned to a school");

    // Optional student login
    let studentUserId: string | null = null;
    if (data.student_email && data.student_password) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.student_email,
        password: data.student_password,
        email_confirm: true,
        user_metadata: { full_name: data.student_full_name, role: "student", school_id: schoolId },
      });
      if (error) throw error;
      studentUserId = created.user?.id ?? null;
    }

    // Insert student row
    const { data: studentRow, error: studentErr } = await supabaseAdmin
      .from("students")
      .insert({
        full_name: data.student_full_name,
        admission_no: data.admission_no,
        class_id: data.class_id ?? null,
        section_id: data.section_id ?? null,
        user_id: studentUserId,
        school_id: schoolId,
      })
      .select("id")
      .single();
    if (studentErr) throw studentErr;

    // Find or create parent auth user
    let parentUserId: string | null = null;
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === data.parent_email.toLowerCase());
    if (existing) {
      parentUserId = existing.id;
    } else {
      const pw = data.parent_password ?? cryptoRandomPassword();
      const { data: createdParent, error: pErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.parent_email,
        password: pw,
        email_confirm: true,
        user_metadata: { full_name: data.parent_full_name, role: "parent", school_id: schoolId },
      });
      if (pErr) throw pErr;
      parentUserId = createdParent.user?.id ?? null;
    }

    // Find or create parents row
    let parentId: string | null = null;
    if (parentUserId) {
      const { data: existingParent } = await supabaseAdmin
        .from("parents").select("id").eq("user_id", parentUserId).maybeSingle();
      if (existingParent) parentId = existingParent.id;
    }
    if (!parentId) {
      const { data: parentRow, error: pInsErr } = await supabaseAdmin
        .from("parents")
        .insert({
          user_id: parentUserId,
          school_id: schoolId,
          full_name: data.parent_full_name,
          email: data.parent_email,
          phone: data.parent_phone ?? null,
        })
        .select("id")
        .single();
      if (pInsErr) throw pInsErr;
      parentId = parentRow.id;
    }

    // Link
    const { error: linkErr } = await supabaseAdmin
      .from("parent_students")
      .insert({ parent_id: parentId, student_id: studentRow.id, relationship: data.relationship ?? null });
    if (linkErr && !linkErr.message.includes("duplicate")) throw linkErr;

    return { studentId: studentRow.id, parentId };
  });

function cryptoRandomPassword() {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
