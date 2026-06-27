// Admin-driven user-creation server functions.
// Service-role admin client is loaded inside handlers only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STUDENT_EMAIL_DOMAIN = "students.scholaris.app";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "school";
}
function cryptoRandomPassword(len = 14) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56]).join("");
}

// ---------- Super Admin: create a School Admin (invite via email) ------------
export const createSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
      school_id: z.string().uuid(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isSuper } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
    if (!isSuper) throw new Error("Forbidden: super_admin only");

    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name, role: "school_admin", school_id: data.school_id },
      redirectTo: `${process.env.PUBLIC_SITE_URL ?? ""}/reset-password`,
    });
    if (error) throw error;
    return { id: created.user?.id, invited: true };
  });

// ---------- School Admin: create staff (teacher / accountant / transport) ----
export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
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

    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name, role: data.role, school_id: schoolId },
      redirectTo: `${process.env.PUBLIC_SITE_URL ?? ""}/reset-password`,
    });
    if (error) throw error;
    return { id: created.user?.id, invited: true };
  });

// ---------- School Admin: create student + auto link/create parent -----------
export const createStudentWithParent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      student_full_name: z.string().min(1),
      admission_no: z.string().min(1),
      class_id: z.string().uuid().optional().nullable(),
      section_id: z.string().uuid().optional().nullable(),
      // optional override; otherwise a synthetic login is generated
      student_email: z.string().email().optional().nullable(),
      parent_full_name: z.string().min(1),
      parent_email: z.string().email(),
      parent_phone: z.string().optional().nullable(),
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

    // Resolve school slug for synthetic email
    const { data: school } = await supabaseAdmin.from("schools").select("name,code").eq("id", schoolId).single();
    const slug = slugify(school?.code || school?.name || "school");
    const studentEmail = data.student_email ?? `${data.admission_no.toLowerCase()}.${slug}@${STUDENT_EMAIL_DOMAIN}`;
    const studentTempPw = cryptoRandomPassword();

    const { data: createdStudent, error: sErr } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: studentTempPw,
      email_confirm: true,
      user_metadata: { full_name: data.student_full_name, role: "student", school_id: schoolId },
    });
    if (sErr) throw sErr;
    const studentUserId = createdStudent.user?.id ?? null;

    // Student row
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
      .select("id").single();
    if (studentErr) throw studentErr;

    // Parent: find by email or invite
    let parentUserId: string | null = null;
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === data.parent_email.toLowerCase());
    if (existing) {
      parentUserId = existing.id;
    } else {
      const { data: createdParent, error: pErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.parent_email,
        {
          data: { full_name: data.parent_full_name, role: "parent", school_id: schoolId },
          redirectTo: `${process.env.PUBLIC_SITE_URL ?? ""}/reset-password`,
        },
      );
      if (pErr) throw pErr;
      parentUserId = createdParent.user?.id ?? null;
    }

    // parents row find-or-create
    let parentId: string | null = null;
    if (parentUserId) {
      const { data: ep } = await supabaseAdmin.from("parents").select("id").eq("user_id", parentUserId).maybeSingle();
      if (ep) parentId = ep.id;
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
        .select("id").single();
      if (pInsErr) throw pInsErr;
      parentId = parentRow.id;
    }

    const { error: linkErr } = await supabaseAdmin
      .from("parent_students")
      .insert({ parent_id: parentId, student_id: studentRow.id, relationship: data.relationship ?? null });
    if (linkErr && !linkErr.message.includes("duplicate")) throw linkErr;

    return {
      studentId: studentRow.id,
      parentId,
      studentLoginEmail: studentEmail,
      studentTempPassword: studentTempPw, // shown to admin ONCE
    };
  });

// ---------- School Admin: reset a student's password (no email round-trip) ---
export const resetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ student_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "school_admin",
    });
    if (!isAdmin) throw new Error("Forbidden: school admin only");
    const { data: schoolId } = await context.supabase.rpc("get_user_school", { _user_id: context.userId });
    if (!schoolId) throw new Error("Your account is not assigned to a school");

    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select("id,user_id,school_id")
      .eq("id", data.student_id).single();
    if (sErr) throw sErr;
    if (student.school_id !== schoolId) throw new Error("Student is not in your school");
    if (!student.user_id) throw new Error("This student has no login account");

    const tempPw = cryptoRandomPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(student.user_id, { password: tempPw });
    if (error) throw error;
    return { tempPassword: tempPw };
  });

// ---------- Super Admin: suspend / unsuspend a school -----------------------
export const setSchoolStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ school_id: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
    if (!isSuper) throw new Error("Forbidden: super_admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("schools").update({ status: data.status }).eq("id", data.school_id);
    if (error) throw error;
    return { ok: true };
  });
