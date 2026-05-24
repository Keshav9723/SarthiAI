// app/auth/reset/page.tsx
// Landing page for the password-reset email link. When the user clicks the
// link from their inbox, Supabase exchanges the recovery token for a session
// and redirects here. We render a "set a new password" form that calls
// supabase.auth.updateUser({ password }).

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset password",
  description: "Set a new password for your Sarthi account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] grid place-items-center px-4 py-10 bg-cream">
      <ResetPasswordForm />
    </div>
  );
}
