# Bootstrapping the first Super Admin

Lovable Cloud doesn't expose self-service Super Admin creation in the app — that's by design (a Super Admin can wipe every school). To create the very first Super Admin:

1. **Create the auth user.** From the Backend → Users panel, click "Add user" and enter an email + temp password. Confirm the email so they can sign in.
2. **Grant the role.** Run this one-time SQL (replace the email):

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'super_admin'::public.app_role from auth.users where email = 'you@example.com'
   on conflict do nothing;

   update public.profiles set status = 'active' where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Sign in at `/login`. You'll land on the Super Admin dashboard.

Every other account is created from inside the app:

- Super Admin invites School Admins (`/superadmin/admins`)
- School Admin invites Teachers / Accountants / Transport (`/admin/teachers`, etc.)
- School Admin creates Students; the matching Parent account is invited automatically by email and linked via `parent_students`. Multiple students can share the same parent.
- Students don't have real email — they get a synthetic login (`{admission_no}.{school-slug}@students.scholaris.app`) with a temp password shown once to the admin. To reset later, use "Reset password" on the student record (admin-only).
