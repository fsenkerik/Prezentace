import { supabaseServer } from "@/lib/supabase/server";

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, set_id, classes(name), topic_sets(title)")
    .eq("id", id)
    .maybeSingle();
  if (!assignment) return new Response("Nenalezeno", { status: 404 });

  const [{ data: topics }, { data: selections }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title")
      .eq("set_id", assignment.set_id)
      .order("position"),
    supabase
      .from("selections")
      .select("topic_id, student_name, created_at")
      .eq("assignment_id", id),
  ]);

  const byTopic = new Map((selections ?? []).map((s) => [s.topic_id, s]));
  const rows = [
    ["Téma", "Žák", "Čas výběru"],
    ...(topics ?? []).map((t) => {
      const pick = byTopic.get(t.id);
      return [
        t.title,
        pick?.student_name ?? "",
        pick ? new Date(pick.created_at).toLocaleString("cs-CZ") : "",
      ];
    }),
  ];

  const cls = (assignment.classes as unknown as { name: string })?.name ?? "trida";
  // Středník a BOM kvůli českému Excelu, který jinak rozhodí diakritiku
  // i rozdělení do sloupců.
  const csv = "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="vyber-${cls.replace(/[^\w.-]/g, "_")}.csv"`,
    },
  });
}
