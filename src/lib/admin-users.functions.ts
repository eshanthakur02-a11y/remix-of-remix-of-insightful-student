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

async function assertSchoolAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId, _role: "school_admin",
  });
  if (!isAdmin) throw new Error("Forbidden: school admin only");
  const { data: schoolId } = await context.supabase.rpc("get_user_school", { _user_id: context.userId });
  if (!schoolId) throw new Error("Your account is not assigned to a school");
  return schoolId as string;
}
async function assertSuperAdmin(context: any) {
  const { data: isSuper } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
  if (!isSuper) throw new Error("Forbidden: super_admin only");
}

// Best-effort audit log; never throws (auditing must never break a write).
async function audit(
  context: any,
  action: string,
  entity: string,
  entity_id: string | null,
  meta: Record<string, unknown> = {},
  school_id: string | null = null,
) {
  try {
    await context.supabase.rpc("log_audit", {
      _action: action, _entity: entity, _entity_id: entity_id,
      _school_id: school_id, _meta: meta,
    });
  } catch { /* swallow */ }
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
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name, role: "school_admin", school_id: data.school_id },
      redirectTo: `${process.env.PUBLIC_SITE_URL ?? ""}/reset-password`,
    });
    if (error) throw error;
    await audit(context, "school_admin.invited", "user", created.user?.id ?? null, { email: data.email }, data.school_id);
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
      phone: z.string().optional().nullable(),
      qualification: z.string().optional().nullable(),
      employee_no: z.string().optional().nullable(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name, role: data.role, school_id: schoolId },
      redirectTo: `${process.env.PUBLIC_SITE_URL ?? ""}/reset-password`,
    });
    if (error) throw error;
    const userId = created.user?.id;
    // Provision domain row when applicable
    if (data.role === "teacher" && userId) {
      await supabaseAdmin.from("teachers").insert({
        user_id: userId,
        school_id: schoolId,
        full_name: data.full_name,
        phone: data.phone ?? null,
        qualification: data.qualification ?? null,
        employee_no: data.employee_no ?? null,
      });
    }
    await audit(context, `${data.role}.invited`, "user", userId ?? null, { email: data.email, role: data.role });
    return { id: userId, invited: true };
  });

// ---------- School Admin: reset staff password (no email) -------------------
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pw = cryptoRandomPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: pw });
    if (error) throw error;
    return { tempPassword: pw };
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
      student_email: z.string().email().optional().nullable(),
      parent_full_name: z.string().min(1),
      parent_email: z.string().email(),
      parent_phone: z.string().optional().nullable(),
      relationship: z.string().optional().nullable(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Respect per-school feature flag for student_login
    const { data: school } = await supabaseAdmin
      .from("schools").select("name,code,features").eq("id", schoolId).single();
    const studentLoginEnabled = (school?.features as any)?.student_login !== false;

    let studentUserId: string | null = null;
    let studentEmail: string | null = null;
    let studentTempPw: string | null = null;

    if (studentLoginEnabled) {
      const slug = slugify(school?.code || school?.name || "school");
      studentEmail = data.student_email ?? `${data.admission_no.toLowerCase()}.${slug}@${STUDENT_EMAIL_DOMAIN}`;
      studentTempPw = cryptoRandomPassword();
      const { data: created, error: sErr } = await supabaseAdmin.auth.admin.createUser({
        email: studentEmail,
        password: studentTempPw,
        email_confirm: true,
        user_metadata: { full_name: data.student_full_name, role: "student", school_id: schoolId },
      });
      if (sErr) throw sErr;
      studentUserId = created.user?.id ?? null;
    }

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

    let parentId: string | null = null;
    if (parentUserId) {
      const { data: ep } = await supabaseAdmin.from("parents").select("id").eq("user_id", parentUserId).maybeSingle();
      if (ep) parentId = ep.id;
    }
    if (!parentId) {
      const { data: parentRow, error: pInsErr } = await supabaseAdmin
        .from("parents").insert({
          user_id: parentUserId, school_id: schoolId, full_name: data.parent_full_name,
          email: data.parent_email, phone: data.parent_phone ?? null,
        }).select("id").single();
      if (pInsErr) throw pInsErr;
      parentId = parentRow.id;
    }

    const { error: linkErr } = await supabaseAdmin
      .from("parent_students")
      .insert({ parent_id: parentId, student_id: studentRow.id, relationship: data.relationship ?? null });
    if (linkErr && !linkErr.message.includes("duplicate")) throw linkErr;

    await audit(context, "student.created", "student", studentRow.id, {
      admission_no: data.admission_no, parent_email: data.parent_email,
    }, schoolId);
    await audit(context, "parent.linked", "parent", parentId, { student_id: studentRow.id }, schoolId);

    return {
      studentId: studentRow.id,
      parentId,
      studentLoginEnabled,
      studentLoginEmail: studentEmail,
      studentTempPassword: studentTempPw,
    };
  });

// ---------- School Admin: reset a student's password ------------------------
export const resetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ student_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student, error: sErr } = await supabaseAdmin
      .from("students").select("id,user_id,school_id").eq("id", data.student_id).single();
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
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("schools").update({ status: data.status }).eq("id", data.school_id);
    if (error) throw error;
    await audit(context, data.status === "suspended" ? "school.suspended" : "school.activated", "school", data.school_id, {}, data.school_id);
    return { ok: true };
  });

// ---------- Super Admin: toggle per-school student_login --------------------
export const setStudentLoginEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ school_id: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sch } = await supabaseAdmin.from("schools").select("features").eq("id", data.school_id).single();
    const features = { ...((sch?.features as any) ?? {}), student_login: data.enabled };
    const { error } = await supabaseAdmin.from("schools").update({ features }).eq("id", data.school_id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Teacher assignment (school_admin) -------------------------------
export const assignTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      teacher_id: z.string().uuid(),
      subject_id: z.string().uuid(),
      class_id: z.string().uuid(),
      section_id: z.string().uuid(),
      session_id: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // verify same-school
    const [{ data: t }, { data: s }] = await Promise.all([
      supabaseAdmin.from("teachers").select("school_id").eq("id", data.teacher_id).single(),
      supabaseAdmin.from("sections").select("school_id,class_id").eq("id", data.section_id).single(),
    ]);
    if (t?.school_id !== schoolId || s?.school_id !== schoolId) throw new Error("Cross-school operation blocked");
    if (s.class_id !== data.class_id) throw new Error("Section does not belong to the chosen class");
    const { error } = await supabaseAdmin.from("teacher_assignments").insert({
      teacher_id: data.teacher_id,
      subject_id: data.subject_id,
      class_id: data.class_id,
      section_id: data.section_id,
      session_id: data.session_id ?? null,
      school_id: schoolId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const unassignTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("teacher_assignments").select("school_id").eq("id", data.id).single();
    if (row?.school_id !== schoolId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("teacher_assignments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Class / Section lifecycle (school_admin) ------------------------
export const setClassStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "archived"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("classes").select("school_id").eq("id", data.id).single();
    if (row?.school_id !== schoolId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("classes").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteClassSafe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSchoolAdmin(context);
    const { error } = await context.supabase.rpc("delete_class_if_unreferenced", { _id: data.id });
    if (error) throw error;
    return { ok: true };
  });

export const setSectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "archived"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("sections").select("school_id").eq("id", data.id).single();
    if (row?.school_id !== schoolId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("sections").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteSectionSafe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSchoolAdmin(context);
    const { error } = await context.supabase.rpc("delete_section_if_unreferenced", { _id: data.id });
    if (error) throw error;
    return { ok: true };
  });
