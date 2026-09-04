import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Corners, topicNumber } from "@/components/ui";
import { addTopics, deleteTopic } from "../../actions";

const STATUS = {
  draft: { label: "Koncept", tag: "tag-neutral" },
  open: { label: "Otevřeno", tag: "tag-accent" },
  closed: { label: "Uzavřeno", tag: "tag-outline" },
} as const;

export default async function SetEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: set } = await supabase
    .from("topic_sets")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!set) notFound();

  const [{ data: topics }, { data: assignments }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, description")
      .eq("set_id", id)
      .order("position"),
    supabase
      .from("assignments")
      .select("id, status, classes(name, student_count)")
      .eq("set_id", id),
  ]);

  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="kicker kicker-muted">Sada témat</div>
        <h2 className="mt-0.5 mb-5 text-[32px]">{set.title}</h2>

        <div className="mb-4 flex flex-wrap items-center gap-2.5 text-[13px]">
          <span className="tag tag-neutral">{(topics ?? []).length} témat</span>
          <span className="muted">
            Témata se žákům ukazují v tomto pořadí.
          </span>
        </div>

        <div className="flex flex-col">
          {(topics ?? []).map((t, i) => (
            <div
              key={t.id}
              className="grid items-center gap-3.5 px-2 py-3"
              style={{
                gridTemplateColumns: "34px 1fr auto",
                borderBottom:
                  "1px solid color-mix(in srgb, var(--color-text) 9%, transparent)",
              }}
            >
              <div className="mono muted text-[13px]">{topicNumber(i)}</div>
              <div className="min-w-0">
                <div
                  className="text-[17px] leading-[1.2] font-semibold"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t.title}
                </div>
                {t.description && (
                  <div className="muted text-[13px]">{t.description}</div>
                )}
              </div>
              <form action={deleteTopic}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="set_id" value={set.id} />
                <button
                  className="btn btn-ghost"
                  style={{ minHeight: 36, color: "var(--color-danger)" }}
                >
                  Smazat
                </button>
              </form>
            </div>
          ))}
          {(topics ?? []).length === 0 && (
            <p className="muted py-4">Sada je zatím prázdná.</p>
          )}
        </div>
      </div>

      <aside
        className="w-full flex-none xl:w-[340px]"
        style={{ borderLeft: "1px solid var(--color-divider)" }}
      >
        <div className="xl:pl-6">
          <h4 className="mb-1 text-[18px]">Přiřazení</h4>
          <p className="muted text-[13px]">
            Sada je přiřazená těmto třídám. Každá má vlastní výběr i vlastní
            kód.
          </p>

          <div className="my-4 flex flex-col gap-3">
            {(assignments ?? []).map((a) => {
              const cls = a.classes as unknown as {
                name: string;
                student_count: number | null;
              };
              const status = STATUS[a.status as keyof typeof STATUS];
              return (
                <div key={a.id} className="blueprint px-3.5 py-3">
                  <Corners />
                  <div className="flex items-center gap-2">
                    <strong
                      className="text-[17px]"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {cls?.name}
                    </strong>
                    <span className={`tag ${status.tag} ml-auto`}>
                      {status.label}
                    </span>
                  </div>
                  {cls?.student_count && (
                    <div className="muted mt-1 text-[12px]">
                      {cls.student_count} žáků
                    </div>
                  )}
                </div>
              );
            })}
            {(assignments ?? []).length === 0 && (
              <p className="muted text-[13px]">
                Zatím nikam. Přiřadíš ji v Přehledu.
              </p>
            )}
          </div>

          <div className="hr" />

          <h5 className="mb-2 text-[15px]">Hromadné vložení</h5>
          <p className="muted mb-2 text-[12px]">
            Jeden řádek = jedno téma. Text za pomlčkou se uloží jako popis.
          </p>
          <form action={addTopics} className="flex flex-col gap-2">
            <input type="hidden" name="set_id" value={set.id} />
            <textarea
              name="bulk"
              required
              className="input"
              style={{ minHeight: 140, fontSize: 13 }}
              placeholder={`Jak funguje internet? — cesta dat od prohlížeče k serveru
Bezpečnost na sociálních sítích — soukromí a digitální stopa`}
            />
            <button className="btn btn-primary btn-block" style={{ minHeight: 40 }}>
              Vložit témata
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
