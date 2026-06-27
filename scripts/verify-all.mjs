import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY;
const PW = "Demo@12345";
const D = "demo.scholaris.app";

const accounts = [
  ["super_admin", `super@${D}`, "/superadmin"],
  ["school_admin", `admin@${D}`, "/admin"],
  ["accountant", `accountant@${D}`, "/accountant"],
  ["transport", `transport@${D}`, "/transport"],
  ["teacher", `teacher.math@${D}`, "/teacher"],
  ["teacher", `teacher.sci@${D}`, "/teacher"],
  ["teacher", `teacher.eng@${D}`, "/teacher"],
  ...Array.from({ length: 15 }, (_, i) => ["student", `student${i+1}@${D}`, "/student"]),
  ...Array.from({ length: 15 }, (_, i) => ["parent", `parent${i+1}@${D}`, "/parent"]),
];

let pass = 0, fail = 0;
const failures = [];
const SCHOOL_ID = "d108d29e-76fe-4a7f-8555-2aed6c7f97f3";

for (const [role, email, home] of accounts) {
  const sb = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PW });
  if (error) { failures.push(`${email}: LOGIN ${error.message}`); fail++; continue; }
  const uid = data.user.id;

  // role + school check
  const { data: rr } = await sb.from("user_roles").select("role,school_id").eq("user_id", uid).maybeSingle();
  const { data: prof } = await sb.from("profiles").select("school_id,status").eq("id", uid).maybeSingle();
  const sid = prof?.school_id ?? rr?.school_id;
  const okRole = rr?.role === role;
  const okSchool = role === "super_admin" ? !sid : sid === SCHOOL_ID;
  const okStatus = prof?.status === "active";

  // RLS isolation spot check: can this user see schools they shouldn't?
  const { data: schools } = await sb.from("schools").select("id");
  const schoolCount = schools?.length ?? 0;
  // super_admin sees all (1 in demo); others should see only their own (1)
  const okSchoolRls = schoolCount <= 1;

  // Cross-school read check: try to read a fabricated other-school student
  // (RLS should silently filter; we just confirm we can't see students outside our school)
  const { data: stu } = await sb.from("students").select("id,school_id").limit(100);
  const leak = (stu || []).some(s => role !== "super_admin" && s.school_id !== SCHOOL_ID);

  const ok = okRole && okSchool && okStatus && okSchoolRls && !leak;
  if (ok) pass++; else { fail++; failures.push(`${email}: role=${rr?.role} sid=${sid} status=${prof?.status} schools=${schoolCount} leak=${leak}`); }
  process.stdout.write(ok ? "." : "F");
  await sb.auth.signOut();
}
console.log(`\n\n${pass}/${accounts.length} passed`);
if (failures.length) { console.log("FAILURES:"); failures.forEach(f => console.log(" -", f)); process.exit(1); }
