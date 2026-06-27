#!/usr/bin/env node
/**
 * Seeds a fully working demo environment.
 * Idempotent: re-running deletes the previous demo school + demo accounts
 * (identified by @demo.scholaris.app email domain & DEMO school code) and rebuilds.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const DOMAIN = "demo.scholaris.app";
const PW = "Demo@12345";
const log = (...a) => console.log("·", ...a);

// ---------- 1. WIPE PRIOR DEMO ----------
async function wipe() {
  log("Wiping prior demo data…");
  // delete users with demo domain
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const demoUsers = (data.users || []).filter(u => (u.email || "").endsWith("@" + DOMAIN));
    for (const u of demoUsers) await sb.auth.admin.deleteUser(u.id).catch(() => {});
    if (!data.users || data.users.length < 200) break;
    page++;
  }
  await sb.from("schools").delete().eq("code", "DEMO");
}

// ---------- 2. HELPERS ----------
async function createUser(email, full_name, role, school_id) {
  const { data, error } = await sb.auth.admin.createUser({
    email, password: PW, email_confirm: true,
    user_metadata: { full_name, role, school_id: school_id ?? null },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  // handle_new_user trigger inserts profile + user_role. Force-activate profile.
  await sb.from("profiles").update({ status: "active", full_name }).eq("id", data.user.id);
  // Ensure role row exists (trigger may skip if metadata missing)
  await sb.from("user_roles").upsert(
    { user_id: data.user.id, role, school_id: school_id ?? null },
    { onConflict: "user_id,role" },
  );
  return data.user.id;
}

async function main() {
  await wipe();

  // ---------- 3. SCHOOL ----------
  log("Creating school…");
  const { data: school, error: sErr } = await sb.from("schools").insert({
    name: "Demo High School", code: "DEMO", address: "123 Demo Avenue",
    phone: "+1 555-0100", email: "info@demo.scholaris.app",
    features: { student_login: true },
  }).select().single();
  if (sErr) throw sErr;
  const SID = school.id;

  // Academic session
  const { data: sess } = await sb.from("academic_sessions").insert({
    school_id: SID, name: "2024-2025",
    start_date: "2024-06-01", end_date: "2025-05-31", is_current: true,
  }).select().single();
  await sb.from("schools").update({ current_session_id: sess.id }).eq("id", SID);

  // ---------- 4. USERS ----------
  log("Creating staff users…");
  const superAdminId = await createUser(`super@${DOMAIN}`, "Super Admin", "super_admin", null);
  const schoolAdminId = await createUser(`admin@${DOMAIN}`, "Alice Principal", "school_admin", SID);
  const accountantId = await createUser(`accountant@${DOMAIN}`, "Bob Accountant", "accountant", SID);
  const transportId = await createUser(`transport@${DOMAIN}`, "Carl Transport", "transport", SID);

  // Teachers
  const teacherDefs = [
    { email: `teacher.math@${DOMAIN}`, name: "Maya Math",     subject: "Mathematics", emp: "T001" },
    { email: `teacher.sci@${DOMAIN}`,  name: "Sam Science",   subject: "Science",     emp: "T002" },
    { email: `teacher.eng@${DOMAIN}`,  name: "Eve English",   subject: "English",     emp: "T003" },
  ];
  const teachers = [];
  for (const t of teacherDefs) {
    const uid = await createUser(t.email, t.name, "teacher", SID);
    const { data: row } = await sb.from("teachers").insert({
      user_id: uid, school_id: SID, full_name: t.name, employee_no: t.emp,
      phone: "+1555000" + t.emp, qualification: "M.Ed.",
    }).select().single();
    teachers.push({ ...t, uid, id: row.id });
  }

  // ---------- 5. SUBJECTS + CLASSES + SECTIONS ----------
  log("Creating subjects, classes, sections…");
  const subjMap = {};
  for (const name of ["Mathematics", "Science", "English"]) {
    const { data } = await sb.from("subjects").insert({ school_id: SID, name, code: name.slice(0,3).toUpperCase() }).select().single();
    subjMap[name] = data.id;
  }
  const classes = {};
  for (const cname of ["Class 10", "Class 11", "Class 12"]) {
    const { data: c } = await sb.from("classes").insert({ school_id: SID, name: cname }).select().single();
    classes[cname] = { id: c.id, sections: {} };
    for (const sname of ["A", "B"]) {
      const { data: sec } = await sb.from("sections").insert({ school_id: SID, class_id: c.id, name: sname }).select().single();
      classes[cname].sections[sname] = sec.id;
    }
  }

  // ---------- 6. TEACHER ASSIGNMENTS ----------
  log("Assigning teachers…");
  const assignMap = [
    { teacher: teachers[0], cls: "Class 10", subj: "Mathematics" }, // 10A + 10B
    { teacher: teachers[1], cls: "Class 11", subj: "Science" },
    { teacher: teachers[2], cls: "Class 12", subj: "English" },
  ];
  for (const a of assignMap) {
    for (const s of ["A", "B"]) {
      await sb.from("teacher_assignments").insert({
        teacher_id: a.teacher.id, subject_id: subjMap[a.subj],
        class_id: classes[a.cls].id, section_id: classes[a.cls].sections[s],
        session_id: sess.id, school_id: SID,
      });
    }
  }

  // ---------- 7. STUDENTS + PARENTS ----------
  log("Creating students & parents…");
  const firstNames = ["Aarav","Diya","Ishaan","Kavya","Liam","Mira","Noah","Olive","Priya","Rohan","Sara","Tara","Uma","Vivek","Yash"];
  const surnames = ["Sharma","Patel","Khan","Verma","Singh","Roy","Iyer","Das","Mehta","Joshi","Bose","Reddy","Gupta","Kapoor","Shah"];
  const students = [];
  let n = 0;
  for (const cname of ["Class 10","Class 11","Class 12"]) {
    for (let i = 0; i < 5; i++) {
      n++;
      const sec = i % 2 === 0 ? "A" : "B";
      const fn = firstNames[n-1], ln = surnames[n-1];
      const sName = `${fn} ${ln}`;
      const adm = `STU${String(n).padStart(3,"0")}`;
      const stuEmail = `student${n}@${DOMAIN}`;
      const parEmail = `parent${n}@${DOMAIN}`;

      const stuUid = await createUser(stuEmail, sName, "student", SID);
      const { data: stu } = await sb.from("students").insert({
        user_id: stuUid, school_id: SID, full_name: sName, admission_no: adm,
        class_id: classes[cname].id, section_id: classes[cname].sections[sec],
        parent_name: `${ln} Family`, parent_phone: "+15550" + String(1000+n),
      }).select().single();

      const parName = `Parent of ${fn}`;
      const parUid = await createUser(parEmail, parName, "parent", SID);
      const { data: par } = await sb.from("parents").insert({
        user_id: parUid, school_id: SID, full_name: parName,
        email: parEmail, phone: "+15550" + String(2000+n),
      }).select().single();
      await sb.from("parent_students").insert({ parent_id: par.id, student_id: stu.id, relationship: "guardian" });

      students.push({ n, name: sName, adm, cname, sec, email: stuEmail, parentEmail: parEmail, id: stu.id });
    }
  }

  // ---------- 8. SAMPLE DATA ----------
  log("Generating attendance, timetable, announcements…");
  // attendance: last 7 weekdays
  const today = new Date();
  const dates = [];
  for (let d = 0; dates.length < 7; d++) {
    const dt = new Date(today); dt.setDate(today.getDate() - d);
    const day = dt.getDay();
    if (day !== 0 && day !== 6) dates.push(dt.toISOString().slice(0,10));
  }
  const attRows = [];
  for (const s of students) {
    for (const d of dates) {
      const r = Math.random();
      const status = r < 0.85 ? "present" : r < 0.93 ? "late" : "absent";
      attRows.push({ student_id: s.id, date: d, status, marked_by: teachers[0].uid });
    }
  }
  for (let i = 0; i < attRows.length; i += 200) {
    await sb.from("attendance").insert(attRows.slice(i, i+200));
  }

  // timetable: Mon-Fri 3 periods for each section
  const ttRows = [];
  for (const cname of ["Class 10","Class 11","Class 12"]) {
    const cls = classes[cname];
    for (const sname of ["A","B"]) {
      for (let day = 1; day <= 5; day++) {
        ttRows.push(
          { class_id: cls.id, section_id: cls.sections[sname], subject_id: subjMap.Mathematics, teacher_id: teachers[0].id, day_of_week: day, start_time: "09:00", end_time: "10:00" },
          { class_id: cls.id, section_id: cls.sections[sname], subject_id: subjMap.Science,     teacher_id: teachers[1].id, day_of_week: day, start_time: "10:15", end_time: "11:15" },
          { class_id: cls.id, section_id: cls.sections[sname], subject_id: subjMap.English,     teacher_id: teachers[2].id, day_of_week: day, start_time: "11:30", end_time: "12:30" },
        );
      }
    }
  }
  await sb.from("timetable").insert(ttRows);

  // announcements
  await sb.from("announcements").insert([
    { school_id: SID, title: "Welcome to Demo High School", body: "All systems are ready for the 2024-2025 session.", audience: "all", created_by: schoolAdminId },
    { school_id: SID, title: "Mid-term exams next month", body: "Please check the exam schedule.", audience: "students", created_by: schoolAdminId },
    { school_id: SID, title: "Staff meeting Friday", body: "All teachers please attend at 3 PM.", audience: "teachers", created_by: schoolAdminId },
  ]);

  // notifications for school admin
  await sb.from("notifications").insert([
    { school_id: SID, user_id: schoolAdminId, kind: "info", title: "Demo data loaded", body: "15 students and 3 teachers added." },
  ]);

  // ---------- 9. REPORT ----------
  console.log("\n========= DEMO ACCOUNTS (password for all: " + PW + ") =========\n");
  const rows = [
    ["Role","Email","Dashboard"],
    ["Super Admin", `super@${DOMAIN}`, "/superadmin"],
    ["School Admin", `admin@${DOMAIN}`, "/admin"],
    ["Accountant", `accountant@${DOMAIN}`, "/accountant"],
    ["Transport", `transport@${DOMAIN}`, "/transport"],
    ...teacherDefs.map(t => [`Teacher (${t.subject})`, t.email, "/teacher"]),
    ...students.map(s => [`Student #${s.n} ${s.cname}-${s.sec}`, s.email, "/student"]),
    ...students.map(s => [`Parent of student #${s.n}`, s.parentEmail, "/parent"]),
  ];
  for (const r of rows) console.log(r.join("  |  "));
  console.log("\n✓ Seed complete.");
}

main().catch(e => { console.error("SEED FAILED:", e); process.exit(1); });
