import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard — NoCap",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DashboardShell email={user?.email ?? null} />;
}
