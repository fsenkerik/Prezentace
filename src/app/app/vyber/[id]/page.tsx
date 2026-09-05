import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Corners, LockIcon, timeOnly, topicNumber } from "@/components/ui";
import {
  assignManually,
  releaseSelection,
  setStatus,
  updateAssignment,
} from "../../actions";
import DateTimeField from "./datetime-field";
import LiveRefresh from "./live-refresh";

const STATES = [
  { value: "draft", label: "Koncept" },
  { value: "open", label: "Otevřeno" },
  { value: "closed", label: "Uzavřeno" },
] as const;

export default async function AssignmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, status, slug, access_code, opens_at, closes_at, show_names, set_id, classes(name, student_count), topic_sets(title)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!assignment) notFound();

  const [{ data: topics }, { data: selections }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title")
      .eq("set_id", assignment.set_id)
      .order("position"),
    supabase
      .from("selections")
      .select("id, topic_id, student_name, created_at, by_teacher")
      .eq("assignment_id", id)
      .order("created_at"),
  ]);

  const byTopic = new Map((selections ?? []).map((s) => [s.topic_id, s] as const));
  const cls = assignment.classes as unknown as {
    name: string;
    student_count: number | null;
  };
  const set = assignment.topic_sets as unknown as { title: string };

  const host = (await headers()).get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const link = `${proto}://${host}/v/${assignment.slug}`;

  const done = selections?.length ?? 0;
  const total = topics?.length ?? 0;
  const target = cls?.student_count ?? total;
  const free = (topics ?? []).filter((t) => !byTopic.has(t.id));
  const recent = [...(selections ?? [])].reverse().slice(0, 5);

  return (
    <div>
      <LiveRefresh assignmentId={assignment.id} />

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1">
          <div className="kicker kicker-muted flex items-center gap-2.5">
            {assignment.status === "open" && <span className="livedot" />}
            Živý přehled · aktualizace okamžitá
          </div>
          <h2 className="mt-1.5 mb-1 text-[32px]">
            {cls?.name} · {set?.title}
          </h2>
          <div className="muted text-[14px]">
            {assignment.opens_at && <>Otevřeno {timeOnly(assignment.opens_at)} · </>}
            {assignment.closes_at && <>uzávěrka {timeOnly(assignment.closes_at)} · </>}
            kód{" "}
            <strong className="mono tracking-[.14em]">
              {assignment.access_code}
            </strong>
          </div>
          <div className="muted mt-1 text-[13px]">
            Odkaz: <span className="mono">{link}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[38px] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
            {done} z {target} vybralo
          </div>
          <div className="muted text-[13px]">
            zbývá {total - done} z {total} témat
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-5">
        <form action={setStatus} className="seg">
          <input type="hidden" name="id" value={assignment.id} />
          {STATES.map((state) => (
            <button
              key={state.value}
              name="status"
              value={state.value}
              className="seg-opt"
              aria-pressed={assignment.status === state.value}
              style={
                assignment.status === state.value
                  ? {
                      background: "var(--color-accent)",
                      color: "var(--color-bg)",
                    }
                  : undefined
              }
            >
              {state.label}
            </button>
          ))}
        </form>

        <form action={updateAssignment} className="flex flex-wrap items-end gap-4">
          <input type="hidden" name="id" value={assignment.id} />
          <DateTimeField
            name="opens_at"
            label="Otevření"
            value={assignment.opens_at}
          />
          <DateTimeField
            name="closes_at"
            label="Uzávěrka"
            value={assignment.closes_at}
          />
          <label className="radio mb-1">
            <input
              type="checkbox"
              name="show_names"
              defaultChecked={assignment.show_names}
            />
            <span className="dot" />
            Jména žákům
          </label>
          <button className="btn btn-secondary" style={{ minHeight: 40 }}>
            Uložit
          </button>
        </form>

        <div className="ml-auto flex gap-2">
          <Link
            href={`/app/vyber/${assignment.id}/projektor`}
            className="btn btn-secondary"
            style={{ minHeight: 40 }}
          >
            Projektorový režim
          </Link>
          <a
            href={`/app/vyber/${assignment.id}/export`}
            className="btn btn-secondary"
            style={{ minHeight: 40 }}
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-8 xl:flex-row">
        <div className="min-w-0 flex-1">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Téma</th>
                <th style={{ width: 200 }}>Žák</th>
                <th style={{ width: 100 }}>Čas</th>
                <th style={{ width: 130 }}>Akce</th>
              </tr>
            </thead>
            <tbody>
              {(topics ?? []).map((t, i) => {
                const pick = byTopic.get(t.id);
                return (
                  <tr key={t.id}>
                    <td className="mono muted text-[12px]">{topicNumber(i)}</td>
                    <td>
                      {pick ? (
                        <span className="strike" style={{ opacity: 0.55 }}>
                          {t.title}
                        </span>
                      ) : (
                        <strong
                          className="text-[16px] font-semibold"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {t.title}
                        </strong>
                      )}
                    </td>
                    <td>
                      {pick ? (
                        <span className="inline-flex items-center gap-1.5">
                          <LockIcon size={13} className="opacity-55" />
                          {pick.student_name}
                          {pick.by_teacher && (
                            <span className="muted text-[11px]">(ručně)</span>
                          )}
                        </span>
                      ) : (
                        <span className="tag tag-outline">volné</span>
                      )}
                    </td>
                    <td className="muted tabular-nums">
                      {pick ? timeOnly(pick.created_at) : "—"}
                    </td>
                    <td>
                      {pick && (
                        <form action={releaseSelection}>
                          <input type="hidden" name="id" value={pick.id} />
                          <input
                            type="hidden"
                            name="assignment_id"
                            value={assignment.id}
                          />
                          <button
                            className="btn btn-ghost"
                            style={{ minHeight: 36, color: "var(--color-danger)" }}
                          >
                            Uvolnit téma
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside
          className="w-full flex-none xl:w-[352px]"
          style={{ borderLeft: "1px solid var(--color-divider)" }}
        >
          <div className="xl:pl-6">
            <div className="flex items-baseline gap-2">
              <h4 className="m-0 text-[19px]">Ještě nevybrali</h4>
              <span className="tag tag-neutral">
                {Math.max(target - done, 0)}
              </span>
            </div>
            <p className="muted text-[12px]">
              Jména těch, kdo ještě nevybrali, aplikace neukáže — žáci se
              nepřihlašují, takže nezná jmenný seznam třídy. Chybějícímu žákovi
              přiřaď téma ručně.
            </p>

            <form action={assignManually} className="mt-4 flex flex-col gap-2">
              <input type="hidden" name="assignment_id" value={assignment.id} />
              <div className="field">
                <label htmlFor="student_name">Jméno a příjmení</label>
                <input
                  id="student_name"
                  name="student_name"
                  required
                  className="input"
                  style={{ minHeight: 40 }}
                />
              </div>
              <div className="field">
                <label htmlFor="topic_id">Volné téma</label>
                <select
                  id="topic_id"
                  name="topic_id"
                  required
                  className="input"
                  style={{ minHeight: 40 }}
                >
                  <option value="">Vyber…</option>
                  {free.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-secondary btn-block"
                style={{ minHeight: 40 }}
                disabled={free.length === 0}
              >
                {free.length === 0 ? "Žádné volné téma" : "Přiřadit téma"}
              </button>
            </form>

            {free.length === 0 && (
              <div
                className="blueprint mt-3.5 px-4 py-3.5"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                }}
              >
                <Corners />
                <div className="text-[14px]">
                  Všechna témata jsou rozebraná. Výběr můžeš uzavřít.
                </div>
              </div>
            )}

            <div className="hr" />

            <h5 className="mb-2.5 text-[15px]">Poslední změny</h5>
            <div className="flex flex-col gap-2">
              {recent.map((s) => {
                const topic = (topics ?? []).find((t) => t.id === s.topic_id);
                return (
                  <div key={s.id} className="muted flex gap-2.5 text-[13px]">
                    <span className="tabular-nums">{timeOnly(s.created_at)}</span>
                    <span className="min-w-0 truncate">
                      {s.student_name} → {topic?.title}
                    </span>
                  </div>
                );
              })}
              {recent.length === 0 && (
                <p className="muted text-[13px]">Zatím nikdo nevybíral.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
