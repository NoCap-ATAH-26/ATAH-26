import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/ChatRoom";

export const metadata: Metadata = {
  title: "Chat — NoCap",
};

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ChatRoom email={user?.email ?? null} />;
}
