import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { supabaseServer } from "@/lib/supabase/server";
import LiveRefresh from "../live-refresh";

export default async function Projector({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, slug, access_code, set_id, classes(name), topic_sets(title)")
    .eq("id", id)
    .maybeSingle();
  if (!assignment) notFound();

  const [{ count: total }, { count: taken }] = await Promise.all([
    supabase
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("set_id", assignment.set_id),
    supabase
      .from("topic_locks")
      .select("topic_id", { count: "exact", head: true })
      .eq("assignment_id", id),
  ]);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const link = `${proto}://${host}/v/${assignment.slug}`;

  // QR se vykreslí na serveru jako data URL — na plátně tak nikdy
  // neprobleskne prázdné místo.
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 720 });
  const set = assignment.topic_sets as unknown as { title: string };
  const cls = assignment.classes as unknown as { name: string };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
      <LiveRefresh assignmentId={assignment.id} />

      <div>
        <p className="text-2xl text-muted-foreground">{cls?.name}</p>
        <h1 className="text-4xl font-semibold">{set?.title}</h1>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt={`QR kód na ${link}`}
        className="size-[min(46vh,420px)] rounded-xl bg-white p-3"
      />

      <div className="space-y-1">
        <p className="text-3xl">{link.replace(/^https?:\/\//, "")}</p>
        <p className="font-mono text-6xl font-bold tracking-[0.2em]">
          {assignment.access_code}
        </p>
      </div>

      <p className="text-5xl font-semibold tabular-nums">
        zbývá {(total ?? 0) - (taken ?? 0)} z {total ?? 0}
      </p>
    </div>
  );
}
