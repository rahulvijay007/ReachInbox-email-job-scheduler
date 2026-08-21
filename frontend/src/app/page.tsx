"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// See dashboard/page.tsx for why this is a client-side redirect rather than
// next/navigation's Server Component redirect().
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
