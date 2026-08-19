import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getPermissionMapForRole } from "@/lib/permissions";
import { AppSidebar } from "@/components/app-shell/sidebar";
import { AppHeader } from "@/components/app-shell/header";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { PermissionsProvider } from "@/components/app-shell/permissions-context";
import { PendingApprovalCard } from "@/components/app-shell/pending-approval-card";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, status, language, theme, profile_completed_at")
    .eq("id", user.id)
    .single();

  // A profile reaches 'invited' via an admin invite, or 'pending' via a
  // self-service /signup — both need the same phone/hosting-availability
  // intake step before anything else in the app. This is the one place
  // that decides this, so it applies uniformly regardless of how they
  // signed in (see the callback route's comment on the same point).
  if ((profile?.status === "invited" || profile?.status === "pending") && !profile.profile_completed_at) {
    redirect("/complete-profile");
  }

  const role = profile?.role ?? "student";
  const name = profile?.full_name || profile?.email || user.email || "Member";
  const isPendingApproval = profile?.status === "pending" && !!profile.profile_completed_at;
  const permissions = await getPermissionMapForRole(role);

  // Applied on this wrapper rather than the root <html> — the root layout
  // renders for signed-out routes too, where there's no profile to read
  // yet. CSS custom properties and dir both inherit fine from a nested
  // element, and every color/spacing utility in this app already goes
  // through those, so scoping here is functionally equivalent for anything
  // inside the authenticated shell. `theme: 'system'` intentionally applies
  // no class and falls back to light — see the Preferences section notes on
  // why OS-preference detection isn't wired up.
  const dir = profile?.language === "ar" ? "rtl" : "ltr";
  const themeClass = profile?.theme === "dark" ? "dark" : "";

  return (
    <div dir={dir} className={cn("flex min-h-dvh flex-1 bg-background", themeClass)}>
      <PermissionsProvider permissions={permissions}>
        <AppSidebar role={role} />
        <div className="flex flex-1 flex-col">
          <AppHeader name={name} role={role} />
          {/* pb clears the fixed mobile bottom nav; md+ has no bottom nav so it collapses back down */}
          <main className="flex-1 px-6 py-8 pb-24 md:pb-8">
            {isPendingApproval ? <PendingApprovalCard /> : children}
          </main>
        </div>
        <BottomNav role={role} />
      </PermissionsProvider>
    </div>
  );
}
