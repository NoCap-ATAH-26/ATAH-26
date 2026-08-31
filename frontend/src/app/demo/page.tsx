import type { Metadata } from "next";
import { PublicDemoShell } from "@/components/PublicDemoShell";

export const metadata: Metadata = {
  title: "Live Demo — NoCap",
  description:
    "The real NoCap pipeline, live, no login required. Every row below is a real Inspector, Repair, or Verifier decision.",
};

export default function DemoPage() {
  return <PublicDemoShell />;
}
