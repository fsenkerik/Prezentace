import Link from "next/link";
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
  const qr = await QRCode.toDataURL(link, {
    margin: 0,
    width: 720,
    color: { dark: "#1d2d3d", light: "#f2f5f8" },
  });

  const set = assignment.topic_sets as unknown as { title: string };
  const cls = assignment.classes as unknown as { name: string };
  const free = (total ?? 0) - (taken ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-[6vw] py-8 lg:flex-row lg:gap-20"
      style={{ background: "var(--color-accent-900)", color: "#f2f5f8" }}
    >
      <LiveRefresh assignmentId={assignment.id} />

      <div className="flex-none bg-[#f2f5f8] p-[26px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt={`QR kód na ${link}`}
          className="size-[min(38vh,420px)]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="text-[clamp(14px,1.6vw,22px)] uppercase tracking-[.2em] opacity-70"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {cls?.name} · {set?.title}
        </div>
        <div
          className="my-2.5 mb-11 text-[clamp(38px,5.4vw,74px)] leading-none"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Vyber si téma
        </div>

        <div className="mono text-[clamp(20px,3.2vw,46px)] opacity-90">
          {link.replace(/^https?:\/\//, "")}
        </div>

        <div
          className="mt-11 mb-1.5 text-[clamp(13px,1.5vw,20px)] uppercase tracking-[.24em] opacity-60"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Přístupový kód
        </div>
        <div className="mono text-[clamp(48px,7.4vw,104px)] leading-none tracking-[.14em]">
          {assignment.access_code}
        </div>

        <div
          className="mt-14 flex items-end gap-5 pt-7"
          style={{ borderTop: "1px solid rgba(242,245,248,.3)" }}
        >
          <div
            className="text-[clamp(70px,11vw,150px)] leading-[.9] tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
            aria-live="polite"
          >
            {free}
          </div>
          <div
            className="pb-4 text-[clamp(20px,2.5vw,34px)] leading-[1.1]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            volných témat
            <br />
            <span className="text-[.62em] opacity-65">
              z {total ?? 0} · ubývají živě
            </span>
          </div>
        </div>
      </div>

      <Link
        href={`/app/vyber/${assignment.id}`}
        className="absolute right-5 top-5 text-[13px] opacity-50 hover:opacity-100"
        style={{ color: "#f2f5f8" }}
      >
        Zavřít
      </Link>
    </div>
  );
}
