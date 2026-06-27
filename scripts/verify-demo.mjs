import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY;
const PW = "Demo@12345";
const accounts = [
  ["super_admin","super@demo.scholaris.app","/superadmin"],
  ["school_admin","admin@demo.scholaris.app","/admin"],
  ["teacher","teacher.math@demo.scholaris.app","/teacher"],
  ["teacher","teacher.sci@demo.scholaris.app","/teacher"],
  ["teacher","teacher.eng@demo.scholaris.app","/teacher"],
  ["student","student1@demo.scholaris.app","/student"],
  ["student","student15@demo.scholaris.app","/student"],
  ["parent","parent1@demo.scholaris.app","/parent"],
  ["parent","parent15@demo.scholaris.app","/parent"],
  ["accountant","accountant@demo.scholaris.app","/accountant"],
  ["transport","transport@demo.scholaris.app","/transport"],
];
let passed = 0, failed = 0;
for (const [expectedRole, email, expectedHome] of accounts) {
  const sb = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PW });
  if (error) { console.log("✗", email, "—", error.message); failed++; continue; }
  const uid = data.user.id;
  const { data: rr } = await sb.from("user_roles").select("role,school_id").eq("user_id", uid).maybeSingle();
  const { data: prof } = await sb.from("profiles").select("school_id,status").eq("id", uid).maybeSingle();
  const ok = rr?.role === expectedRole && (expectedRole === "super_admin" ? !rr?.school_id : !!(prof?.school_id || rr?.school_id));
  console.log(ok ? "✓" : "✗", email, "role=", rr?.role, "school=", prof?.school_id ?? rr?.school_id ?? "—", "status=", prof?.status, "→", expectedHome);
  ok ? passed++ : failed++;
  await sb.auth.signOut();
}
console.log(`\n${passed} passed, ${failed} failed`);
