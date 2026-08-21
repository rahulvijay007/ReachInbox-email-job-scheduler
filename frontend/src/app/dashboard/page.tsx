"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-side redirect (useRouter, not next/navigation's redirect()) —
 * a Server Component redirect() nested inside this route's Client Component
 * layout (DashboardLayout) triggers a known Next.js 14.2.x dev-mode bug
 * ("Rendered more hooks than during the previous render" inside the
 * internal <Router>), because Strict Mode double-renders the tree while the
 * redirect throw is in flight. Doing it client-side in an effect avoids
 * that class of bug entirely.
 */
export default function DashboardIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/scheduled");
  }, [router]);
  return null;
}
