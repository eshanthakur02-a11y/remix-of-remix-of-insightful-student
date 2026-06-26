import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupClosed,
  head: () => ({ meta: [{ title: "Sign up — Scholaris" }] }),
});

function SignupClosed() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md glass-card p-8 text-center">
        <div className="h-12 w-12 mx-auto rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)" }}>
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Self sign-up is disabled</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Scholaris accounts are created by your school administrator.
          Teachers, students, accountants, and parents receive their login from the school admin.
          School admins are created by the platform Super Admin.
        </p>
        <Link to="/login" className="text-primary hover:underline text-sm">Back to sign in</Link>
      </div>
    </div>
  );
}
