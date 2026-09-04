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
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">Výběr nenalezen</h1>
        <p className="text-muted-foreground">
          Odkaz je nejspíš překlepnutý, nebo učitel výběr ještě nespustil.
        </p>
      </main>
    );
  }

  return <StudentBoard slug={slug} info={info} />;
}
