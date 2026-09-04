"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Drží učitelský přehled živý. Sama nic nevykresluje — jen si všimne
 *  změny v obsazenosti a nechá server komponentu překreslit. */
export default function LiveRefresh({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`teacher:${assignmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "topic_locks",
          filter: `assignment_id=eq.${assignmentId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    const timer = setInterval(() => router.refresh(), 20_000);

    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [assignmentId, router]);

  return null;
}
