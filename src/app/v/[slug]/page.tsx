import { supabaseServer } from "@/lib/supabase/server";
import type { BoardInfo } from "@/lib/types";
import StudentBoard from "./student-board";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("board_info", { p_slug: slug });
  const info = data as BoardInfo | null;

  if (!info) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 text-center">
        <div className="kicker kicker-muted mb-2">Nenalezeno</div>
        <h3 className="text-[26px]">Tenhle výběr neexistuje</h3>
        <p className="muted text-[13px]">
          Odkaz je nejspíš překlepnutý, nebo ho vyučující ještě nespustil.
        </p>
      </main>
    );
  }

  return <StudentBoard slug={slug} info={info} />;
}
