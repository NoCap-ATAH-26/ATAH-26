"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Severity = "critical" | "important" | "info";

export type Notification = {
  file_name: string;
  stage: string;
  status: string;
  severity: Severity;
  title: string;
  what_changed: string;
  all_issues: string[];
  impact: string;
  source: string;
  recommended_action: string;
  reason: string;
  timestamp: string;
};

/**
 * Live-subscribes to the 50 most recent notifications, newest first.
 * Updates automatically whenever inspector.py / verifier.py call
 * notifier.notify() — no manual refresh needed.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setNotifications(snapshot.docs.map((doc) => doc.data() as Notification));
        setLoading(false);
      },
      (err) => {
        console.error("Notifications subscription error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { notifications, loading };
}